import { number } from "fp-ts";
import { sign } from "ton-crypto";
import { Cell, InternalMessage } from "../..";
import { Maybe } from "../../types";
import { WalletV1SigningMessage } from "./WalletV1SigningMessage";
import { WalletV2SigningMessage } from "./WalletV2SigningMessage";
import { WalletV3SigningMessage } from "./WalletV3SigningMessage";

export async function createWalletTransferV1(args: { seqno: number, sendMode: number, order: InternalMessage, secretKey: Buffer }) {

    let signingMessage = new WalletV1SigningMessage({
        seqno: args.seqno,
        sendMode: args.sendMode,
        order: args.order
    });

    // Sign message
    const cell = new Cell();
    signingMessage.writeTo(cell);
    let signature = sign(await cell.hash(), args.secretKey);

    // Body
    const body = new Cell();
    body.bits.writeBuffer(signature);
    signingMessage.writeTo(body);

    return body;
}

export async function createWalletTransferV2(args: { seqno: number, sendMode: number, order: InternalMessage, secretKey: Buffer, timeout?: Maybe<number> }) {

    let signingMessage = new WalletV2SigningMessage({
        seqno: args.seqno,
        sendMode: args.sendMode,
        order: args.order,
        timeout: args.timeout
    });

    // Sign message
    const cell = new Cell();
    signingMessage.writeTo(cell);
    let signature = sign(await cell.hash(), args.secretKey);

    // Body
    const body = new Cell();
    body.bits.writeBuffer(signature);
    signingMessage.writeTo(body);

    return body;
}

export async function createWalletTransferV3(args: {
    seqno: number,
    sendMode: number,
    walletId: number,
    order: InternalMessage,
    secretKey: Buffer,
    timeout?: Maybe<number>
}) {

    let signingMessage = new WalletV3SigningMessage({
        timeout: args.timeout,
        walletId: args.walletId,
        seqno: args.seqno,
        sendMode: args.sendMode,
        order: args.order
    });

    // Sign message
    const cell = new Cell();
    signingMessage.writeTo(cell);
    let signature = sign(await cell.hash(), args.secretKey);

    // Body
    const body = new Cell();
    body.bits.writeBuffer(signature);
    signingMessage.writeTo(body);

    return body;
}