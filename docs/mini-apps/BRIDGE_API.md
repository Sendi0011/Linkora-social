# Bridge API Documentation

## Profile Access

- **Method:** `profile.get`
- **Permission Required:** `profile.read`
- **Return Shape:**
  ```json
  {
    "address": "<wallet address>",
    "username": null, // currently not persisted; reserved for future use
    "creatorToken": "<auth token>"
  }
  ```
- **Behavior:**
  - Returns the wallet address and creator token if a wallet is connected.
  - Returns `null` when no wallet address is stored (i.e., the user is not connected).
  - The data is read‑only – mini‑apps cannot modify the returned object.
- **Usage Example:**
  ```js
  const profile = await LinkoraSDK.profile.get();
  if (profile) {
    console.log('Address:', profile.address);
    console.log('Token:', profile.creatorToken);
  } else {
    console.log('No wallet connected');
  }
  ```

## Other Bridge Methods
(Existing methods such as `wallet.getAddress`, `wallet.sign`, etc., remain unchanged.)
