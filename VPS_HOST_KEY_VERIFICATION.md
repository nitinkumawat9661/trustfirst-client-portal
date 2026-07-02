# VPS Host Key Verification

## Summary

- Timestamp: 2026-07-02T17:55:01.430Z
- .env.deploy.local created: yes
- Host masked: 45.10.x.x
- Port: 22
- DNS/IP result: 45.10.21.141 (IPv4)
- Key path exists: yes
- Key path masked: %USERPROFILE%\.ssh\cafeluxe_vps_ed25519
- Key is public key: no
- Key looks like OpenSSH private key: yes
- Mismatch: yes
- Required trusted fingerprint: missing
- Decision: not verified
- Known_hosts repaired: no
- Backup path: not created
- Deployment attempted: no
- CafeLuxe untouched: yes

## Existing known_hosts Fingerprints

- ED25519: SHA256:WOrGpBngyEQismYclNOX1KU/Dfy2A+uwJDjCAXxM464
- RSA: SHA256:GSfOPFTaILBNtEstYu0W5Zq0TdHG4Gtg3i/quLWHGks
- ECDSA: SHA256:ZWwcfBYIFIMoCekQg5I2CGNsnSC1B41smvKn1d+84kA

## Current ssh-keyscan Fingerprints

- none collected

## Risk Explanation

A host-key mismatch can mean the VPS was rebuilt, the provider rotated host keys, DNS/IP now points to a different server, or a man-in-the-middle attack is possible. Deployment must not continue until the current fingerprint is confirmed by the VPS owner or provider through a trusted channel.

## Raw known_hosts Lookup

```text
# Host 45.10.21.141 found: line 3
45.10.21.141 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK1Jc4IY1ppuPjK9pnhIaVa71AszM/XX3YtJm6vr75EK
# Host 45.10.21.141 found: line 4
45.10.21.141 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCefDNQyAZhSNmCii6kJPYCATxfufP++/Wi99heto+fwEwVlMf89HA1BxFUeZTk7dxbipkH1xuAp3PW8QDE8DatXHzPFSeMWrqM/zRVCnnauLG2oI62tjVSE5pHg1zgaH0ipo7ir/Rtg5QvlFdw5ABXyttmYsngIFhvbRTcj7F1V0MeNsv1BV6IrwIZdjovRCo2hUUguuWkSSFxUthRAjWOSEQvYoq8Rrk9Gy4pMVSZj3qXy90X/VywStgL2K36IY/OdRKnVn+RtGpLoaE9hZ3+xDDnnOot6RwO0pz77e4xJPKsasayHKO5xPpWtaZA9Ulp5AAMAfi3IfiQeLB5HYgjTby54N7C1unftm27idk+Zz3Q+itz/eqMcPyuCMI64zhmQ/Fcjvn+arE2KwjNw5DBe4vAIERf7u6+0r72ahwcV9jfGh0VVa4kjUvm5D9uwnheOEWjKI1QOcVGgSiPIX1BpvQo6ngNH7t+efJ/lDmTS/z5I4KmWG1iZC1hsTe/p38=
# Host 45.10.21.141 found: line 5
45.10.21.141 ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBPZQZqVMbFABALxZ6jtNyUR/eEKxSMNpw/zqSlOfldYuLxi1bf2sJohFmMfwccAOMT+cxd9HxV/NF/9XomlmlWE=
```

## Raw ssh-keyscan Output

```text
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com
# 45.10.21.141:22 SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.15
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com
```

## Strict SSH Verification Output

```text
ssh: connect to host 45.10.21.141 port 22: Connection timed out
```

## Notes

ssh-keyscan did not return a usable host key. known_hosts was not modified.
