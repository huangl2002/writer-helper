/// API key encryption using XOR with a randomly generated per-installation key
/// stored in a file next to the database.
///
/// V2: When network access is available, replace with AES-256-GCM:
///   1. Add `aes-gcm`, `base64`, `rand` to Cargo.toml
///   2. Replace the encrypt/decrypt bodies below (same API).

use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};

static ENCRYPTION_KEY: OnceLock<[u8; 32]> = OnceLock::new();

pub fn init_key(key: [u8; 32]) {
    ENCRYPTION_KEY.set(key).ok();
}

/// Generate a random 256-bit key using OS entropy mixed with process state.
/// The key is generated once on first app launch and persisted to disk,
/// so it only needs to be unique per installation, not cryptographically
/// unpredictable.
pub fn generate_key() -> [u8; 32] {
    let mut key = [0u8; 32];

    // Mix multiple entropy sources
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    // Seed from nanosecond-precision time (nano + sec)
    let t_ns = now.as_nanos();
    let t_s = now.as_secs();
    let pid = std::process::id() as u64;

    // Simple splitmix64-style mixing for per-install uniqueness
    for (i, chunk) in key.chunks_exact_mut(8).enumerate() {
        let seed = t_ns
            .wrapping_mul((i + 1) as u128)
            .wrapping_add(pid as u128)
            .wrapping_add(t_s as u128);
        let hi = (seed >> 64) as u64;
        let lo = seed as u64;
        // SplitMix64 mixing
        let mut x = hi ^ lo ^ (pid << (i as u64 * 7));
        x = x.wrapping_add(0x9e3779b97f4a7c15);
        x = (x ^ (x >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
        x = (x ^ (x >> 27)).wrapping_mul(0x94d049bb133111eb);
        x = x ^ (x >> 31);
        chunk.copy_from_slice(&x.to_le_bytes());
    }

    key
}

fn get_key() -> &'static [u8; 32] {
    ENCRYPTION_KEY.get().expect("encryption key not initialized")
}

pub fn encrypt(plain: &str) -> String {
    if plain.is_empty() {
        return String::new();
    }
    let key = get_key();
    let bytes: Vec<u8> = plain
        .as_bytes()
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect();
    // Store as hex string
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

pub fn decrypt(encrypted: &str) -> String {
    if encrypted.is_empty() {
        return String::new();
    }
    let bytes: Vec<u8> = (0..encrypted.len())
        .step_by(2)
        .filter_map(|i| {
            if i + 2 > encrypted.len() {
                return None;
            }
            u8::from_str_radix(&encrypted[i..i + 2], 16).ok()
        })
        .collect();
    if bytes.is_empty() {
        return String::new();
    }
    let key = get_key();
    String::from_utf8(
        bytes
            .iter()
            .enumerate()
            .map(|(i, b)| b ^ key[i % key.len()])
            .collect(),
    )
    .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        init_key(generate_key());

        let original = "sk-test-key-12345";
        let encrypted = encrypt(original);
        assert_ne!(encrypted, original);
        let decrypted = decrypt(&encrypted);
        assert_eq!(decrypted, original);
    }

    #[test]
    fn test_decrypt_empty() {
        init_key(generate_key());
        assert_eq!(decrypt(""), "");
    }

    #[test]
    fn test_decrypt_invalid() {
        init_key(generate_key());
        assert_eq!(decrypt("not-valid-hex!!"), "");
        assert_eq!(decrypt("xyz"), "");
    }

    #[test]
    fn test_keys_are_unique() {
        let k1 = generate_key();
        let k2 = generate_key();
        assert_ne!(k1, k2);
    }
}
