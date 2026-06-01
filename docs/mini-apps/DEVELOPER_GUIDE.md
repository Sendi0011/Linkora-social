# Linkora Mini Apps — Developer Guide

> **Bridge API reference:** [`BRIDGE_API.md`](./BRIDGE_API.md)
> **Example mini app:** [`examples/mini-apps/creator-token/`](../../examples/mini-apps/creator-token/)

---

## What is a Linkora Mini App?

A Linkora mini app is a sandboxed web application (HTML + JS) that runs inside the Linkora mobile client. It can access the user's Stellar wallet and Linkora profile through a controlled bridge API — without ever seeing the user's private key.

Mini apps are useful for:

- Creator token dashboards and tipping flows
- Community pool interfaces
- Custom reward or loyalty mechanics
- Any on-chain interaction that benefits from a native-feeling UI

The host app enforces a permission model: a mini app can only call bridge methods it has explicitly declared in its `linkora-manifest.json`. Any undeclared call is rejected with a `PermissionDenied` error before it reaches the wallet.

---

## Creating a `linkora-manifest.json`

Every mini app must include a `linkora-manifest.json` at its root. This file tells the Linkora host app how to load your mini app and which bridge permissions it needs.

```json
{
  "name": "My Mini App",
  "version": "1.0.0",
  "description": "A short description shown in the mini app browser.",
  "entry": "index.html",
  "permissions": [
    "wallet.getAddress",
    "wallet.signTransaction",
    "profile.get"
  ],
  "author": "Your Name or Org",
  "homepage": "https://github.com/your-org/your-mini-app",
  "categories": ["creator", "payments"],
  "minSdkVersion": "1.0.0"
}
```

### Fields

| Field | Required | Description |
|---|---|---|
| `name` | ✅ | Display name shown in the mini app browser |
| `version` | ✅ | Semver string (e.g. `"1.0.0"`) |
| `description` | ✅ | One-line description |
| `entry` | ✅ | Relative path to the HTML entry point |
| `permissions` | ✅ | Array of bridge methods your app will call (see [Bridge API](./BRIDGE_API.md)) |
| `author` | ✅ | Author name or organisation |
| `homepage` | — | URL to source or docs |
| `categories` | — | Array of category strings for discovery |
| `minSdkVersion` | — | Minimum Linkora SDK version required |

> Only request permissions your app actually uses. Users see the permission list before launching a mini app.

---

## Available Bridge APIs and Permissions

The bridge is injected as `window.LinkoraSDK` when your app runs inside the Linkora host. Each method requires the matching permission string in your manifest.

| Permission | Method | Description |
|---|---|---|
| `wallet.getAddress` | `LinkoraSDK.wallet.getAddress()` | Returns the connected Stellar address |
| `wallet.sign` | `LinkoraSDK.wallet.sign(payload)` | Signs an arbitrary payload — prompts user approval |
| `wallet.signTransaction` | `LinkoraSDK.wallet.signTransaction(txXdr)` | Signs a Stellar XDR transaction — prompts user approval |
| `profile.get` | `LinkoraSDK.profile.get()` | Returns the user's Linkora profile |

Full method signatures, parameters, return types, and error codes are documented in [`BRIDGE_API.md`](./BRIDGE_API.md).

---

## Building Your First Mini App

### 1. Create the project structure

```
my-mini-app/
├── linkora-manifest.json
└── index.html
```

### 2. Write `linkora-manifest.json`

```json
{
  "name": "Hello Linkora",
  "version": "1.0.0",
  "description": "Shows the connected wallet address.",
  "entry": "index.html",
  "permissions": ["wallet.getAddress"],
  "author": "Your Name",
  "minSdkVersion": "1.0.0"
}
```

### 3. Write `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello Linkora</title>
  </head>
  <body>
    <h1>Your address</h1>
    <p id="address">Loading…</p>

    <script>
      const SDK = window.LinkoraSDK;

      SDK.wallet.getAddress()
        .then((address) => {
          document.getElementById("address").textContent = address;
        })
        .catch((err) => {
          document.getElementById("address").textContent = "Error: " + err.message;
        });
    </script>
  </body>
</html>
```

---

## Testing Your Mini App Locally

### Option A — Mock SDK in the browser

When running outside the Linkora host, `window.LinkoraSDK` is `undefined`. Add a mock at the top of your script for local development:

```js
const SDK = window.LinkoraSDK || {
  wallet: {
    getAddress: async () => "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    sign: async (payload) => ({ signature: "mock-sig" }),
    signTransaction: async (txXdr) => ({ signedTxXdr: txXdr }),
  },
  profile: {
    get: async () => ({
      username: "testuser",
      address: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
      creatorToken: { code: "TEST", issuer: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN" },
    }),
  },
};
```

Serve your app with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser.

### Option B — Load in the Linkora dev build

1. Clone the Linkora repo and run the mobile app in development mode.
2. Place your mini app folder under `examples/mini-apps/your-app/`.
3. The mini app browser will pick it up automatically from the local filesystem.

### Checking permissions

If you call a method not listed in your `permissions` array, the bridge throws:

```js
BridgeError { code: "PermissionDenied", message: "Mini app has not declared wallet.signTransaction" }
```

Add the missing permission to `linkora-manifest.json` and reload.

---

## Submitting to the Mini App Registry

1. **Host your mini app** — deploy to any static host (GitHub Pages, Vercel, IPFS, etc.).
2. **Verify your manifest** — ensure `linkora-manifest.json` is served at the root of your deployment URL.
3. **Open a submission PR** — add an entry to `registry/mini-apps.json` in the Linkora repo:

```json
{
  "name": "My Mini App",
  "manifestUrl": "https://your-host.example/linkora-manifest.json",
  "author": "your-github-username"
}
```

4. **Review checklist** before submitting:
   - [ ] Only necessary permissions are declared
   - [ ] No external scripts loaded from untrusted CDNs
   - [ ] App works with the mock SDK (no hard dependency on live wallet)
   - [ ] `minSdkVersion` is set correctly
   - [ ] `description` is clear and accurate

5. A maintainer will review and merge. Once merged, your app appears in the Linkora mini app browser on the next release.

---

## Security Guidelines

- **Never ask users to paste their secret key.** The bridge never exposes it.
- **Always validate amounts client-side** before calling `wallet.signTransaction`. Show the user exactly what they are signing.
- **Do not load third-party scripts** that could exfiltrate wallet data.
- **Handle `BridgeError` gracefully** — always wrap bridge calls in try/catch and show a human-readable error.

---

## Resources

- [Bridge API Reference](./BRIDGE_API.md)
- [Example: Creator Token mini app](../../examples/mini-apps/creator-token/)
- [Linkora Contract API](../../README.md#smart-contract-overview)
- [Stellar Testnet Friendbot](https://friendbot.stellar.org)
- [Stellar Horizon Testnet](https://horizon-testnet.stellar.org)
