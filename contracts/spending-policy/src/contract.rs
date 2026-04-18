//! PayKit spending policy — implements OpenZeppelin [`Policy`] for Smart Accounts.

use soroban_sdk::{
    auth::Context,
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, Address, Env,
    Vec,
};
use stellar_accounts::{
    policies::Policy,
    smart_account::{ContextRule, Signer},
};

use crate::logic::{
    empty_spend_state, enforce_limits, parse_amount_domain, PaykitPolicy, RuleSpendState,
};

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 4701,
    NotInitialized = 4702,
    UnauthorizedAdmin = 4703,
    InvalidInstallParams = 4704,
    RuleNotInstalled = 4705,
    RuleAlreadyInstalled = 4706,
}

#[contracttype]
#[derive(Clone)]
pub enum InstanceKey {
    Admin,
    Init,
    /// Optional global template (informational / future sync); enforcement uses per-rule config.
    PolicyTemplate,
}

#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    RuleConfig(Address, u32),
    RuleSpend(Address, u32),
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct PolicyEnforced {
    #[topic]
    pub smart_account: Address,
    pub context_rule_id: u32,
    pub amount: i128,
    pub domain_len: u32,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct PolicyInstalled {
    #[topic]
    pub smart_account: Address,
    pub context_rule_id: u32,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct PolicyUninstalled {
    #[topic]
    pub smart_account: Address,
    pub context_rule_id: u32,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct GlobalPolicySet {
    #[topic]
    pub admin: Address,
}

#[contract]
pub struct SpendingPolicyContract;

fn load_admin(e: &Env) -> Address {
    e.storage()
        .instance()
        .get::<_, Address>(&InstanceKey::Admin)
        .unwrap_or_else(|| panic_with_error!(e, ContractError::NotInitialized))
}

fn ensure_initialized(e: &Env) {
    if !e.storage().instance().has(&InstanceKey::Init) {
        panic_with_error!(e, ContractError::NotInitialized);
    }
}

fn validate_install_params(e: &Env, p: &PaykitPolicy) {
    if p.daily_cap <= 0 || p.per_tx_cap <= 0 || p.per_tx_cap > p.daily_cap {
        panic_with_error!(e, ContractError::InvalidInstallParams);
    }
}

#[contractimpl]
impl SpendingPolicyContract {
    /// One-time setup. `admin` authorizes future [`Self::set_policy`] calls.
    pub fn initialize(e: Env, admin: Address) {
        if e.storage().instance().has(&InstanceKey::Init) {
            panic_with_error!(&e, ContractError::AlreadyInitialized);
        }
        admin.require_auth();
        e.storage().instance().set(&InstanceKey::Admin, &admin);
        e.storage().instance().set(&InstanceKey::Init, &true);
    }

    /// Admin-only: move the instance admin to a new address (e.g. key rotation).
    pub fn rotate_admin(e: Env, current_admin: Address, new_admin: Address) {
        ensure_initialized(&e);
        let expected = load_admin(&e);
        if current_admin != expected {
            panic_with_error!(&e, ContractError::UnauthorizedAdmin);
        }
        current_admin.require_auth();
        e.storage().instance().set(&InstanceKey::Admin, &new_admin);
    }

    /// Admin-only: update the global template snapshot (does not rewrite existing per-rule installs).
    pub fn set_policy(e: Env, admin: Address, policy: PaykitPolicy) {
        ensure_initialized(&e);
        let expected = load_admin(&e);
        if admin != expected {
            panic_with_error!(&e, ContractError::UnauthorizedAdmin);
        }
        admin.require_auth();
        validate_install_params(&e, &policy);
        e.storage()
            .instance()
            .set(&InstanceKey::PolicyTemplate, &policy);
        GlobalPolicySet { admin }.publish(&e);
    }

    pub fn get_policy_template(e: Env) -> Option<PaykitPolicy> {
        e.storage()
            .instance()
            .get(&InstanceKey::PolicyTemplate)
    }

    pub fn get_admin(e: Env) -> Address {
        load_admin(&e)
    }

    pub fn get_rule_config(e: Env, smart_account: Address, context_rule_id: u32) -> Option<PaykitPolicy> {
        let key = StorageKey::RuleConfig(smart_account, context_rule_id);
        e.storage().persistent().get(&key)
    }

    pub fn get_rule_spend(
        e: Env,
        smart_account: Address,
        context_rule_id: u32,
    ) -> Option<RuleSpendState> {
        let key = StorageKey::RuleSpend(smart_account, context_rule_id);
        e.storage().persistent().get(&key)
    }

    /// Dry-run authorization for off-chain / debugging (does not persist spend).
    pub fn check_and_authorize(
        e: Env,
        smart_account: Address,
        context_rule_id: u32,
        spender: Address,
        amount: i128,
        domain: soroban_sdk::Bytes,
    ) -> bool {
        ensure_initialized(&e);
        let admin = load_admin(&e);
        let cfg: PaykitPolicy = {
            let key = StorageKey::RuleConfig(smart_account.clone(), context_rule_id);
            e.storage()
                .persistent()
                .get(&key)
                .unwrap_or_else(|| panic_with_error!(&e, ContractError::RuleNotInstalled))
        };
        let spend: RuleSpendState = {
            let key = StorageKey::RuleSpend(smart_account.clone(), context_rule_id);
            e.storage()
                .persistent()
                .get(&key)
                .unwrap_or_else(|| empty_spend_state(&e, e.ledger().timestamp()))
        };
        crate::logic::check_limits(&e, &cfg, &spend, &admin, &spender, amount, &domain)
    }
}

#[contractimpl]
impl Policy for SpendingPolicyContract {
    type AccountParams = PaykitPolicy;

    fn enforce(
        e: &Env,
        context: Context,
        authenticated_signers: Vec<Signer>,
        context_rule: ContextRule,
        smart_account: Address,
    ) {
        ensure_initialized(e);
        smart_account.require_auth();
        let admin = load_admin(e);
        let cfg: PaykitPolicy = {
            let key = StorageKey::RuleConfig(smart_account.clone(), context_rule.id);
            e.storage()
                .persistent()
                .get(&key)
                .unwrap_or_else(|| panic_with_error!(e, ContractError::RuleNotInstalled))
        };
        let key_spend = StorageKey::RuleSpend(smart_account.clone(), context_rule.id);
        let mut spend: RuleSpendState = e
            .storage()
            .persistent()
            .get(&key_spend)
            .unwrap_or_else(|| empty_spend_state(e, e.ledger().timestamp()));

        enforce_limits(
            e,
            &cfg,
            &context,
            &authenticated_signers,
            &mut spend,
            &admin,
        );
        e.storage().persistent().set(&key_spend, &spend);

        let (amount, domain) = parse_amount_domain(e, &context);
        PolicyEnforced {
            smart_account: smart_account.clone(),
            context_rule_id: context_rule.id,
            amount,
            domain_len: domain.len(),
        }
        .publish(e);
    }

    fn install(
        e: &Env,
        install_params: PaykitPolicy,
        context_rule: ContextRule,
        smart_account: Address,
    ) {
        ensure_initialized(e);
        smart_account.require_auth();
        validate_install_params(e, &install_params);
        let cfg_key = StorageKey::RuleConfig(smart_account.clone(), context_rule.id);
        if e.storage().persistent().has(&cfg_key) {
            panic_with_error!(e, ContractError::RuleAlreadyInstalled);
        }
        e.storage().persistent().set(&cfg_key, &install_params);
        let sk = StorageKey::RuleSpend(smart_account.clone(), context_rule.id);
        let now = e.ledger().timestamp();
        e.storage()
            .persistent()
            .set(&sk, &empty_spend_state(e, now));
        PolicyInstalled {
            smart_account: smart_account.clone(),
            context_rule_id: context_rule.id,
        }
        .publish(e);
    }

    fn uninstall(e: &Env, context_rule: ContextRule, smart_account: Address) {
        ensure_initialized(e);
        smart_account.require_auth();
        let cfg_key = StorageKey::RuleConfig(smart_account.clone(), context_rule.id);
        if !e.storage().persistent().has(&cfg_key) {
            panic_with_error!(e, ContractError::RuleNotInstalled);
        }
        e.storage().persistent().remove(&cfg_key);
        let sk = StorageKey::RuleSpend(smart_account.clone(), context_rule.id);
        e.storage().persistent().remove(&sk);
        PolicyUninstalled {
            smart_account: smart_account.clone(),
            context_rule_id: context_rule.id,
        }
        .publish(e);
    }
}
