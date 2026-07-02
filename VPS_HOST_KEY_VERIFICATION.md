# VPS Host Key Verification

## Summary

- Timestamp: 2026-07-02T17:37:41.651Z
- Host masked: not configured
- Port: not configured
- DNS/IP result: not available
- Mismatch: yes
- Required trusted fingerprint: missing
- Decision: not verified
- Known_hosts repaired: no
- Backup path: not created
- Deployment attempted: no
- CafeLuxe untouched: yes

## Existing known_hosts Fingerprints

- none collected

## Current ssh-keyscan Fingerprints

- none collected

## Risk Explanation

A host-key mismatch can mean the VPS was rebuilt, the provider rotated host keys, DNS/IP now points to a different server, or a man-in-the-middle attack is possible. Deployment must not continue until the current fingerprint is confirmed by the VPS owner or provider through a trusted channel.

## Raw known_hosts Lookup

```text
No known_hosts entry found or lookup failed.
```

## Raw ssh-keyscan Output

```text
No ssh-keyscan output collected.
```

## Strict SSH Verification Output

```text
Strict SSH verification was not run or did not complete.
```

## Notes

.env.deploy.local is required. Copy .env.deploy.example and fill authorized TrustFirst/Manglam VPS access. Create .env.deploy.local from .env.deploy.example before collecting host-key evidence.
