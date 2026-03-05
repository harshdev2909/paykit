import { Router, Request, Response } from "express";
import { requestDepositUrl, requestWithdrawUrl } from "../../services/stellarAnchorService";
import { getKeypairByPublicKey } from "../../wallet/walletService";

const router = Router();

router.post("/deposit", async (req: Request, res: Response) => {
  try {
    const { anchorDomain, assetCode, account, email, memo } = req.body;
    if (!anchorDomain || !assetCode || !account) {
      res.status(400).json({ error: "Missing required fields: anchorDomain, assetCode, account" });
      return;
    }
    const accountStr = String(account).trim();
    const keypair = await getKeypairByPublicKey(accountStr);
    const result = await requestDepositUrl(
      {
        anchorDomain: String(anchorDomain),
        assetCode: String(assetCode),
        account: accountStr,
        email: email ? String(email) : undefined,
        memo: memo ? String(memo) : undefined,
      },
      keypair ?? undefined
    );
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anchor deposit request failed";
    res.status(500).json({ error: message });
  }
});

router.post("/withdraw", async (req: Request, res: Response) => {
  try {
    const { anchorDomain, assetCode, account, type, email, memo } = req.body;
    if (!anchorDomain || !assetCode || !account) {
      res.status(400).json({ error: "Missing required fields: anchorDomain, assetCode, account" });
      return;
    }
    const accountStr = String(account).trim();
    const keypair = await getKeypairByPublicKey(accountStr);
    const result = await requestWithdrawUrl(
      {
        anchorDomain: String(anchorDomain),
        assetCode: String(assetCode),
        account: accountStr,
        type: type ? String(type) : undefined,
        email: email ? String(email) : undefined,
        memo: memo ? String(memo) : undefined,
      },
      keypair ?? undefined
    );
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anchor withdraw request failed";
    res.status(500).json({ error: message });
  }
});

export default router;
