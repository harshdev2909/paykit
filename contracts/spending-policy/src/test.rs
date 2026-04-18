extern crate std;

use soroban_sdk::{
    auth::{Context, ContractContext},
    symbol_short,
    testutils::{Address as _, Ledger},
    Address, Bytes, Env, IntoVal, Vec,
};

use stellar_accounts::smart_account::{ContextRule, ContextRuleType, Signer};

use crate::contract::SpendingPolicyContract;
use crate::logic::PaykitPolicy;

fn rule(e: &Env, id: u32) -> ContextRule {
    let mut signers = Vec::new(e);
    signers.push_back(Signer::Delegated(Address::generate(e)));
    ContextRule {
        id,
        context_type: ContextRuleType::CallContract(Address::generate(e)),
        name: soroban_sdk::String::from_str(e, "paykit-rule"),
        signers,
        signer_ids: Vec::new(e),
        policies: Vec::new(e),
        policy_ids: Vec::new(e),
        valid_until: None,
    }
}

fn transfer_context(e: &Env, amount: i128) -> Context {
    let contract_address = Address::generate(e);
    let from = Address::generate(e);
    let to = Address::generate(e);
    let mut args = Vec::new(e);
    args.push_back(from.into_val(e));
    args.push_back(to.into_val(e));
    args.push_back(amount.into_val(e));
    Context::Contract(ContractContext {
        contract: contract_address,
        fn_name: symbol_short!("transfer"),
        args,
    })
}

fn x402_context(e: &Env, amount: i128, domain: &[u8]) -> Context {
    let contract_address = Address::generate(e);
    let mut args = Vec::new(e);
    args.push_back(amount.into_val(e));
    let d = Bytes::from_slice(e, domain);
    args.push_back(d.into_val(e));
    Context::Contract(ContractContext {
        contract: contract_address,
        fn_name: symbol_short!("x402_pay"),
        args,
    })
}

fn base_policy(e: &Env) -> PaykitPolicy {
    PaykitPolicy {
        daily_cap: 10_000,
        per_tx_cap: 5_000,
        allowed_domains: Vec::new(e),
        session_key: None,
        session_expires_at: None,
    }
}

#[test]
fn happy_path_transfer_admin_signer() {
    let e = Env::default();
    e.ledger().set_timestamp(1_700_000_000);
    let policy_id = e.register(SpendingPolicyContract, ());
    let admin = Address::generate(&e);
    let smart_account = Address::generate(&e);

    e.mock_all_auths();

    let client = crate::contract::SpendingPolicyContractClient::new(&e, &policy_id);
    client.initialize(&admin);

    let ctx_rule = rule(&e, 1);
    client.install(&base_policy(&e), &ctx_rule, &smart_account);

    let mut signers = Vec::new(&e);
    signers.push_back(Signer::Delegated(admin.clone()));

    client.enforce(
        &transfer_context(&e, 100),
        &signers,
        &ctx_rule,
        &smart_account,
    );

    let spend = client.get_rule_spend(&smart_account, &1u32).unwrap();
    assert_eq!(spend.spent_in_window, 100);
}

#[test]
#[should_panic(expected = "Error(Contract, #4802)")]
fn per_tx_cap_exceeded() {
    let e = Env::default();
    e.ledger().set_timestamp(1_700_000_000);
    let policy_id = e.register(SpendingPolicyContract, ());
    let admin = Address::generate(&e);
    let smart_account = Address::generate(&e);
    e.mock_all_auths();

    let client = crate::contract::SpendingPolicyContractClient::new(&e, &policy_id);
    client.initialize(&admin);
    let ctx_rule = rule(&e, 1);
    client.install(&base_policy(&e), &ctx_rule, &smart_account);

    let mut signers = Vec::new(&e);
    signers.push_back(Signer::Delegated(admin.clone()));

    client.enforce(
        &transfer_context(&e, 6_000),
        &signers,
        &ctx_rule,
        &smart_account,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4803)")]
fn daily_cap_exceeded() {
    let e = Env::default();
    e.ledger().set_timestamp(1_700_000_000);
    let policy_id = e.register(SpendingPolicyContract, ());
    let admin = Address::generate(&e);
    let smart_account = Address::generate(&e);
    e.mock_all_auths();

    let client = crate::contract::SpendingPolicyContractClient::new(&e, &policy_id);
    client.initialize(&admin);
    let ctx_rule = rule(&e, 1);
    client.install(&base_policy(&e), &ctx_rule, &smart_account);

    let mut signers = Vec::new(&e);
    signers.push_back(Signer::Delegated(admin.clone()));

    client.enforce(
        &transfer_context(&e, 5_000),
        &signers,
        &ctx_rule,
        &smart_account,
    );
    client.enforce(
        &transfer_context(&e, 5_000),
        &signers,
        &ctx_rule,
        &smart_account,
    );
    client.enforce(
        &transfer_context(&e, 1),
        &signers,
        &ctx_rule,
        &smart_account,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4804)")]
fn domain_not_allowed() {
    let e = Env::default();
    e.ledger().set_timestamp(1_700_000_000);
    let policy_id = e.register(SpendingPolicyContract, ());
    let admin = Address::generate(&e);
    let smart_account = Address::generate(&e);
    e.mock_all_auths();

    let mut allowed = Vec::new(&e);
    allowed.push_back(Bytes::from_slice(&e, b"good.example"));

    let p = PaykitPolicy {
        daily_cap: 10_000,
        per_tx_cap: 5_000,
        allowed_domains: allowed,
        session_key: None,
        session_expires_at: None,
    };

    let client = crate::contract::SpendingPolicyContractClient::new(&e, &policy_id);
    client.initialize(&admin);
    let ctx_rule = rule(&e, 1);
    client.install(&p, &ctx_rule, &smart_account);

    let mut signers = Vec::new(&e);
    signers.push_back(Signer::Delegated(admin.clone()));

    client.enforce(
        &x402_context(&e, 100, b"other.example"),
        &signers,
        &ctx_rule,
        &smart_account,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4806)")]
fn session_expired_no_valid_signer() {
    let e = Env::default();
    e.ledger().set_timestamp(2_000_000_000);
    let policy_id = e.register(SpendingPolicyContract, ());
    let admin = Address::generate(&e);
    let session = Address::generate(&e);
    let smart_account = Address::generate(&e);
    e.mock_all_auths();

    let p = PaykitPolicy {
        daily_cap: 10_000,
        per_tx_cap: 5_000,
        allowed_domains: Vec::new(&e),
        session_key: Some(session.clone()),
        session_expires_at: Some(1_900_000_000),
    };

    let client = crate::contract::SpendingPolicyContractClient::new(&e, &policy_id);
    client.initialize(&admin);
    let ctx_rule = rule(&e, 1);
    client.install(&p, &ctx_rule, &smart_account);

    let mut signers = Vec::new(&e);
    signers.push_back(Signer::Delegated(session.clone()));

    client.enforce(
        &transfer_context(&e, 100),
        &signers,
        &ctx_rule,
        &smart_account,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4806)")]
fn admin_rotation_old_admin_rejected() {
    let e = Env::default();
    e.ledger().set_timestamp(1_700_000_000);
    let policy_id = e.register(SpendingPolicyContract, ());
    let admin = Address::generate(&e);
    let new_admin = Address::generate(&e);
    let smart_account = Address::generate(&e);
    e.mock_all_auths();

    let client = crate::contract::SpendingPolicyContractClient::new(&e, &policy_id);
    client.initialize(&admin);
    client.rotate_admin(&admin, &new_admin);

    let ctx_rule = rule(&e, 1);
    client.install(&base_policy(&e), &ctx_rule, &smart_account);

    let mut signers = Vec::new(&e);
    signers.push_back(Signer::Delegated(admin.clone()));

    client.enforce(
        &transfer_context(&e, 50),
        &signers,
        &ctx_rule,
        &smart_account,
    );
}
