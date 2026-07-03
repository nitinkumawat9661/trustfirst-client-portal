# VPS Host Key Verification

## Summary

- Timestamp: 2026-07-03T06:09:03.401Z
- .env.deploy.local created: yes
- Host masked: 45.10.x.x
- Port: 22
- DNS/IP result: 45.10.21.141 (IPv4)
- Key path exists: yes
- Key path masked: %USERPROFILE%\.ssh\trustfirst_vps_ed25519
- Key is public key: no
- Key looks like OpenSSH private key: yes
- Mismatch: no
- Required trusted fingerprint: SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0
- Decision: verified by trusted fingerprint match
- Known_hosts repaired: yes
- Backup path: C:\Users\DELL\.ssh\known_hosts.trustfirst-backup-20260703060858
- Deployment attempted: yes, Sprint 38 deploy completed after verification
- Deployment result: succeeded
- SSH access passed: yes
- App URL: http://45.10.21.141:3010
- App port: 3010
- CafeLuxe untouched: yes

## Existing known_hosts Fingerprints

- ED25519: SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0

## Current ssh-keyscan Fingerprints

- ED25519: SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0 (Git for Windows ssh-keyscan)
- RSA: SHA256:U/yYcVMljDyvORobFkagh5xyj+XmVLeed8MQt/MlwmY (Git for Windows ssh-keyscan)
- ECDSA: SHA256:xTzBtiL+q/EsSR3/2buZioRuZl/z64QeXJJjvJe86vA (Git for Windows ssh-keyscan)

## Risk Explanation

A host-key mismatch can mean the VPS was rebuilt, the provider rotated host keys, DNS/IP now points to a different server, or a man-in-the-middle attack is possible. Deployment must not continue until the current fingerprint is confirmed by the VPS owner or provider through a trusted channel.

## Raw known_hosts Lookup

```text
# Host 45.10.21.141 found: line 6
45.10.21.141 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHfng3mX7BxZIM7llpJvK2jGZLyDRAOZ7w7kHLSSUTgi
```

## Raw ssh-keyscan Output

```text
## Windows OpenSSH ssh-keyscan
### ed25519
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com

### rsa
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com

### ecdsa
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com

## Git for Windows ssh-keyscan
### ed25519
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
45.10.21.141 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHfng3mX7BxZIM7llpJvK2jGZLyDRAOZ7w7kHLSSUTgi

### rsa
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
45.10.21.141 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDst9tJQ7nsUceZlLbF4VDWrOdHZMR5FDz4psWrwcjcHWJIMSNMAdb3/UbMmA2zjJeYbS3b4CGok0c8m85iMhhG8RriiUdOXLOqBz5zIt55pb+FCOoh5b5rCTyuaazAak6Cs5T1LwSCdIdaaPCzZk9Ku/x2mXJMkE/RWZfvwWjj8xHpPc+mesxyw2SKD9l6cRF41xAFqZ5qqkz+bLW4VO4spUDr3wb8+Wf4Avk27RzI6qbRRa7HYH1xCIkPpVBKBMuLK6+RQzERC6v/8Sb8HL41tQ0mJS26SeXsvy0p1GoJUr/05yJUDsKo+rEOcf4kLmo3K9gAAxOfuLruSV0AGoTXpexSNHQ8hWsPlFDA7EQgL2gOgOhvWP+iW7jQzLePDGKdN72jkGwBC9XEd3loVhiqhlBbEJvkj1z/7Tt4/sFJ84kQn/bE24tko9RUy0ugGYuUEgd9DYP5r8xes9fbcvuUNoF8WPzfmLTctdyh9Rdc9ge467UGU8ca/uDPahG+e2s=

### ecdsa
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
45.10.21.141 ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBGJy8Qb535xJ0DjgfcSvLRB8E6f4LtPUpcEzN8xibf9ETA+5mbqNsXOcSP+bfzdzubQeT97bMmoQiEQ+VlshM6Q=
```

## Strict SSH Verification Output

```text
zonetichosting
Linux zonetichosting 5.15.0-181-generic #191-Ubuntu SMP Fri May 22 19:09:02 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
```

## Notes

known_hosts was backed up, only the configured host entry was removed, the verified key was added, and strict SSH verification succeeded.
