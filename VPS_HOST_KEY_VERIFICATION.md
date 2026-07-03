# VPS Host Key Verification

## Summary

- Timestamp: 2026-07-03T06:51:12.206Z
- .env.deploy.local created: yes
- Host masked: 45.10.x.x
- Port: 22
- DNS/IP result: 45.10.21.141 (IPv4)
- Key path exists: yes
- Key path masked: %USERPROFILE%\.ssh\trustfirst_vps_ed25519
- Key is public key: no
- Key looks like OpenSSH private key: yes
- Mismatch: not determined; current host key could not be collected
- Required trusted fingerprint: SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0
- Decision: blocked by SSH timeout
- Known_hosts repaired: no
- Backup path: not created
- Deployment attempted: no
- CafeLuxe untouched: yes

## Existing known_hosts Fingerprints

- ED25519: SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0

## Current ssh-keyscan Fingerprints

- none collected

## Risk Explanation

A host-key mismatch can mean the VPS was rebuilt, the provider rotated host keys, DNS/IP now points to a different server, or a man-in-the-middle attack is possible. In this Sprint 39 retry, no current key was collected because SSH timed out. Deployment must not continue until `ssh-keyscan` can collect the current host key and it matches the trusted fingerprint or is reconfirmed by the VPS owner/provider through a trusted channel.

## Raw known_hosts Lookup

```text
# Host 45.10.21.141 found: line 6
45.10.21.141 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHfng3mX7BxZIM7llpJvK2jGZLyDRAOZ7w7kHLSSUTgi
```

## Raw ssh-keyscan Output

```text
## Windows OpenSSH ssh-keyscan
### ed25519
No output.

### rsa
No output.

### ecdsa
No output.

## Git for Windows ssh-keyscan
### ed25519
No output.

### rsa
No output.

### ecdsa
No output.
```

## Strict SSH Verification Output

```text
ssh: connect to host 45.10.21.141 port 22: Connection timed out
```

## Notes

ssh-keyscan did not return a usable host key. known_hosts was not modified.
