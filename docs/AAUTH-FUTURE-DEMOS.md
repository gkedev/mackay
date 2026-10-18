# AAuth — Future Demo Considerations

Status: ideas for later demos. Not part of the BB Player first implementation slice.

## 1. Purchase approval as per-call authorization

Map a purchase onto AAuth:

1. **Merchant → resource token.** The merchant issues a resource token carrying the full context of the purchase (the offer). It is a per-call authorization request for that specific purchase.
2. **Agent → auth token request.** The agent presents the resource token to its Person Server (PS) and requests an auth token.
3. **PS → user approval.** The PS interacts with the user, or a supervisor service acting for the user, to approve the purchase.
4. **Auth token = proof of approval.** The issued auth token proves that this specific purchase was approved (the acceptance).

### Contrast with Poppy

- Poppy has no entity that represents the user independently of the agent. In AAuth, the PS fills that role.
- Poppy does not integrity-protect the offer and acceptance. In AAuth, the merchant signs the offer in the resource token, and the auth token binds the approval to that exact offer.
