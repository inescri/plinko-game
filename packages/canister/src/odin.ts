import { call, IDL } from 'azle';
import { Principal } from '@dfinity/principal';

/**
 * Client for the Odin multiplexed ICRC ledger. Odin holds every token balance
 * in ONE ledger canister, addressed by (owner, subaccount) where the subaccount
 * is `odin_token_pointer(tokenId)` — i.e. the token identity is encoded in the
 * subaccount, not in a separate per-token ledger principal.
 *
 * Deposit/withdraw therefore both talk to this single canister:
 *   - deposit  pulls pre-approved funds via `icrc2_transfer_from`
 *   - withdraw sends funds back via `icrc1_transfer`
 * both from/to the caller's and this canister's per-token subaccount.
 *
 * The ledger principal differs per Odin environment, so every function takes
 * it as its first argument. The canister reads it from the `ledger_id` init
 * argument; see odin_ledger.ts for the known ids.
 */

/**
 * The flat BTC ledger fee and the token it is paid in live in `@plinko/shared`
 * so the frontend approves exactly what this canister pulls. Re-exported here
 * so the fee stays importable from the ledger client.
 */
export { ODIN_BTC_FEE, ODIN_BTC_TOKEN_ID } from '@plinko/shared';

const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
});

const TransferFromArgs = IDL.Record({
    spender_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from: Account,
    to: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
});

const TransferArgs = IDL.Record({
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    to: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
});

const TransferError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    InsufficientAllowance: IDL.Record({ allowance: IDL.Nat }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
});

const TransferResult = IDL.Variant({ Ok: IDL.Nat, Err: TransferError });

type TransferResultValue =
    | { Ok: bigint }
    | { Err: Record<string, unknown> };

/** JSON.stringify replacer — ICRC error records carry Nat (bigint) fields. */
function stringifyError(err: Record<string, unknown>): string {
    return JSON.stringify(err, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
    );
}

/**
 * The subaccount under which `tokenId`'s balance is stored on the Odin ledger.
 * Both the depositor's approval and this canister's holdings live here.
 */
async function tokenPointer(
    ledger: Principal,
    tokenId: string,
): Promise<Uint8Array> {
    return await call<[string], Uint8Array>(
        ledger,
        'odin_token_pointer',
        {
            args: [tokenId],
            paramIdlTypes: [IDL.Text],
            returnIdlType: IDL.Vec(IDL.Nat8),
        },
    );
}

/**
 * Pull `amount` of `tokenId` on `ledger` from `from` into `to` using the
 * ICRC-2 allowance
 * the depositor granted (spender = `to`). Returns the block index; throws with
 * the decoded error on failure.
 *
 * The deposit flow awaits this BEFORE crediting the internal ledger, so a
 * credit is only recorded for funds that actually settled into this canister.
 */
export async function odinPullToken(
    ledger: Principal,
    tokenId: string,
    from: Principal,
    to: Principal,
    amount: bigint,
): Promise<bigint> {
    const subaccount = await tokenPointer(ledger, tokenId);
    const result = await call<[unknown], TransferResultValue>(
        ledger,
        'icrc2_transfer_from',
        {
            args: [
                {
                    // Odin ledger requires spender_subaccount == from.subaccount
                    // (the per-token pointer); a mismatch traps with error 914.
                    spender_subaccount: [subaccount],
                    from: { owner: from, subaccount: [subaccount] },
                    to: { owner: to, subaccount: [subaccount] },
                    amount,
                    fee: [],
                    memo: [],
                    created_at_time: [],
                },
            ],
            paramIdlTypes: [TransferFromArgs],
            returnIdlType: TransferResult,
        },
    );

    if ('Err' in result) {
        throw new Error(
            `Odin transfer_from failed: ${stringifyError(result.Err)}`,
        );
    }

    return result.Ok;
}

/**
 * Send `amount` of `tokenId` from this canister's per-token subaccount back to
 * `to`'s per-token subaccount on the Odin `ledger`. Returns the block index;
 * throws with the decoded error on failure so withdraw can refund.
 */
export async function odinSendToken(
    ledger: Principal,
    tokenId: string,
    to: Principal,
    amount: bigint,
): Promise<bigint> {
    const subaccount = await tokenPointer(ledger, tokenId);
    const result = await call<[unknown], TransferResultValue>(
        ledger,
        'icrc1_transfer',
        {
            args: [
                {
                    from_subaccount: [subaccount],
                    to: { owner: to, subaccount: [subaccount] },
                    amount,
                    fee: [],
                    memo: [],
                    created_at_time: [],
                },
            ],
            paramIdlTypes: [TransferArgs],
            returnIdlType: TransferResult,
        },
    );

    if ('Err' in result) {
        throw new Error(`Odin transfer failed: ${stringifyError(result.Err)}`);
    }

    return result.Ok;
}
