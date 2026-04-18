//! Core PayKit spending + domain policy enforcement (rolling 24h window by ledger timestamp).

use soroban_sdk::{
    auth::Context,
    contracterror, contracttype, panic_with_error,
    symbol_short,
    Address, Bytes, Env, TryFromVal, Vec,
};
use stellar_accounts::smart_account::Signer;

/// Configuration installed per smart-account context rule (snapshotted at `Policy::install`).
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PaykitPolicy {
    pub daily_cap: i128,
    pub per_tx_cap: i128,
    /// Empty vector = allow any domain label (UTF-8 bytes, e.g. `api.example.com`).
    pub allowed_domains: Vec<Bytes>,
    pub session_key: Option<Address>,
    /// Ledger timestamp (seconds) until which `session_key` may sign without admin.
    pub session_expires_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RuleSpendState {
    /// Start of rolling 24h window (unix timestamp seconds from ledger).
    pub window_start: u64,
    /// Total spent in window (same units as caps).
    pub spent_in_window: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum PaykitPolicyError {
    InvalidAmount = 4801,
    PerTxCapExceeded = 4802,
    DailyCapExceeded = 4803,
    DomainNotAllowed = 4804,
    NoAuthenticatedSigner = 4806,
    UnsupportedContext = 4809,
}

const ROLLING_WINDOW_SECS: u64 = 86_400;

pub fn has_delegated_signer(signers: &Vec<Signer>, addr: &Address) -> bool {
    let mut i = 0u32;
    while i < signers.len() {
        if let Signer::Delegated(a) = signers.get(i).unwrap() {
            if a == *addr {
                return true;
            }
        }
        i += 1;
    }
    false
}

fn domain_allowed(_e: &Env, allowed: &Vec<Bytes>, domain: &Bytes) -> bool {
    if allowed.len() == 0 {
        return true;
    }
    let mut i = 0u32;
    while i < allowed.len() {
        let d = allowed.get(i).unwrap();
        if d == *domain {
            return true;
        }
        i += 1;
    }
    false
}

pub fn rolling_reset_if_needed(state: &mut RuleSpendState, now: u64) {
    if now.saturating_sub(state.window_start) >= ROLLING_WINDOW_SECS {
        state.window_start = now;
        state.spent_in_window = 0;
    }
}

/// Parse `(amount, domain)` from authorization [`Context`].
/// Supports custom `x402_pay(amount, domain)` and native/token `transfer` (domain empty).
pub fn parse_amount_domain(e: &Env, context: &Context) -> (i128, Bytes) {
    match context {
        Context::Contract(cc) => {
            let transfer = symbol_short!("transfer");
            let x402 = symbol_short!("x402_pay");
            if cc.fn_name == transfer {
                let amount = match cc.args.get(2) {
                    Some(v) => i128::try_from_val(e, &v).unwrap_or_else(|_| {
                        panic_with_error!(e, PaykitPolicyError::UnsupportedContext)
                    }),
                    None => panic_with_error!(e, PaykitPolicyError::UnsupportedContext),
                };
                return (amount, Bytes::from_slice(e, b""));
            }
            if cc.fn_name == x402 {
                let amount = match cc.args.get(0) {
                    Some(v) => i128::try_from_val(e, &v).unwrap_or_else(|_| {
                        panic_with_error!(e, PaykitPolicyError::UnsupportedContext)
                    }),
                    None => panic_with_error!(e, PaykitPolicyError::UnsupportedContext),
                };
                let domain = match cc.args.get(1) {
                    Some(v) => Bytes::try_from_val(e, &v).unwrap_or_else(|_| {
                        panic_with_error!(e, PaykitPolicyError::UnsupportedContext)
                    }),
                    None => panic_with_error!(e, PaykitPolicyError::UnsupportedContext),
                };
                return (amount, domain);
            }
            panic_with_error!(e, PaykitPolicyError::UnsupportedContext)
        }
        _ => panic_with_error!(e, PaykitPolicyError::UnsupportedContext),
    }
}

/// Session-only spends use half caps when session sub-caps are not modeled separately.
fn session_per_tx_cap(policy: &PaykitPolicy) -> i128 {
    (policy.per_tx_cap / 2).max(1)
}

fn session_daily_cap(policy: &PaykitPolicy) -> i128 {
    (policy.daily_cap / 2).max(1)
}

/// Returns true when signers include either the admin or an active session key delegate.
pub fn signers_allow_action(
    e: &Env,
    policy: &PaykitPolicy,
    signers: &Vec<Signer>,
    admin: &Address,
) -> bool {
    if signers.is_empty() {
        return false;
    }
    let now = e.ledger().timestamp();
    if let Some(ref sk) = policy.session_key {
        let session_live = policy
            .session_expires_at
            .map(|ex| now < ex)
            .unwrap_or(false);
        if session_live && has_delegated_signer(signers, sk) {
            return true;
        }
    }
    has_delegated_signer(signers, admin)
}

/// Validates signers: either admin delegated signer, or active session_key delegated signer.
pub fn validate_signers(
    e: &Env,
    policy: &PaykitPolicy,
    signers: &Vec<Signer>,
    admin: &Address,
) {
    if !signers_allow_action(e, policy, signers, admin) {
        panic_with_error!(e, PaykitPolicyError::NoAuthenticatedSigner);
    }
}

/// Enforce caps and domain; update rolling spend state. Panics on failure.
pub fn enforce_limits(
    e: &Env,
    policy: &PaykitPolicy,
    context: &Context,
    signers: &Vec<Signer>,
    spend: &mut RuleSpendState,
    admin: &Address,
) {
    validate_signers(e, policy, signers, admin);

    let now = e.ledger().timestamp();
    let (amount, domain) = parse_amount_domain(e, context);
    if amount <= 0 {
        panic_with_error!(e, PaykitPolicyError::InvalidAmount);
    }

    let session_only = policy.session_key.as_ref().map_or(false, |sk| {
        let live = policy.session_expires_at.map(|ex| now < ex).unwrap_or(false);
        live && has_delegated_signer(signers, sk) && !has_delegated_signer(signers, admin)
    });

    let per_cap = if session_only {
        session_per_tx_cap(policy)
    } else {
        policy.per_tx_cap
    };
    let daily_cap = if session_only {
        session_daily_cap(policy)
    } else {
        policy.daily_cap
    };

    if amount > per_cap {
        panic_with_error!(e, PaykitPolicyError::PerTxCapExceeded);
    }
    if !domain_allowed(e, &policy.allowed_domains, &domain) {
        panic_with_error!(e, PaykitPolicyError::DomainNotAllowed);
    }

    rolling_reset_if_needed(spend, now);
    if spend.spent_in_window.saturating_add(amount) > daily_cap {
        panic_with_error!(e, PaykitPolicyError::DailyCapExceeded);
    }
    spend.spent_in_window = spend.spent_in_window.saturating_add(amount);
}

/// Read-only check used by [`crate::contract::SpendingPolicyContract::check_and_authorize`].
pub fn check_limits(
    e: &Env,
    policy: &PaykitPolicy,
    spend: &RuleSpendState,
    admin: &Address,
    spender: &Address,
    amount: i128,
    domain: &Bytes,
) -> bool {
    if amount <= 0 {
        return false;
    }

    let now = e.ledger().timestamp();
    let mut signers: Vec<Signer> = Vec::new(e);
    signers.push_back(Signer::Delegated(spender.clone()));
    if !signers_allow_action(e, policy, &signers, admin) {
        return false;
    }

    let mut s = spend.clone();
    rolling_reset_if_needed(&mut s, now);

    let session_only = policy.session_key.as_ref().map_or(false, |sk| {
        let live = policy.session_expires_at.map(|ex| now < ex).unwrap_or(false);
        live && sk == spender && !has_delegated_signer(&signers, admin)
    });

    let per_cap = if session_only {
        session_per_tx_cap(policy)
    } else {
        policy.per_tx_cap
    };
    let daily_cap = if session_only {
        session_daily_cap(policy)
    } else {
        policy.daily_cap
    };

    if amount > per_cap {
        return false;
    }
    if !domain_allowed(e, &policy.allowed_domains, domain) {
        return false;
    }
    if s.spent_in_window.saturating_add(amount) > daily_cap {
        return false;
    }
    true
}

pub fn empty_spend_state(_e: &Env, now: u64) -> RuleSpendState {
    RuleSpendState {
        window_start: now,
        spent_in_window: 0,
    }
}
