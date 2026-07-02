# SSH Client Compatibility Report

## Summary

- Windows SSH client: `C:\Windows\System32\OpenSSH\ssh.exe`
- Windows SSH version: `OpenSSH_for_Windows_9.5p2, LibreSSL 3.8.2`
- Windows ssh-keyscan: `C:\Windows\System32\OpenSSH\ssh-keyscan.exe`
- Windows ssh-keyscan version: not available; `ssh-keyscan -V` returns usage output.
- Git for Windows: `C:\Program Files\Git\cmd\git.exe`
- Git OpenSSH tools: present in `C:\Program Files\Git\usr\bin`
- WSL: launcher exists, but WSL is not installed.
- PuTTY/plink/puttygen: not found.

## Compatibility Findings

Windows OpenSSH `ssh-keyscan` reached the server banner but failed with:

```text
choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com
```

Git for Windows `ssh-keyscan` successfully collected ED25519, RSA, and ECDSA host key material for `45.10.21.141:22` during Sprint 31. Later repeat attempts timed out, so the network path appears intermittently unstable even though port 22 tested reachable.

## Network Diagnostics

- `Test-NetConnection 45.10.21.141 -Port 22`: reachable, `TcpTestSucceeded: True`.
- Ping: 4/4 replies, average approximately 191 ms.
- Traceroute: completed to `zonetichosting.com [45.10.21.141]` with intermittent timed-out hops.

## Recommendation

Use Git for Windows OpenSSH tools for host-key collection on this laptop. Do not repair `known_hosts` until the VPS owner confirms one of the current fingerprints in `VPS_HOST_KEY_VERIFICATION.md` and `.env.deploy.local` is updated with either:

```bash
DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=<confirmed-fingerprint>
```

or:

```bash
DEPLOY_HOST_KEY_VERIFIED=yes
```

No SSH client installation or system restart was performed.
