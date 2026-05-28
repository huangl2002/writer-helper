/// Simple XOR encryption for API key storage.
/// V2 will replace with AES-256-GCM.

const XOR_KEY: &[u8] = b"ai-writer-helper-v1-secret-salt-key-2024-2025-2026!";

pub fn encrypt(plain: &str) -> String {
    let bytes: Vec<u8> = plain
        .as_bytes()
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ XOR_KEY[i % XOR_KEY.len()])
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
            u8::from_str_radix(&encrypted[i..i + 2], 16).ok()
        })
        .collect();
    String::from_utf8(
        bytes
            .iter()
            .enumerate()
            .map(|(i, b)| b ^ XOR_KEY[i % XOR_KEY.len()])
            .collect(),
    )
    .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let original = "sk-test-key-12345";
        let encrypted = encrypt(original);
        assert_ne!(encrypted, original);
        let decrypted = decrypt(&encrypted);
        assert_eq!(decrypted, original);
    }
}
