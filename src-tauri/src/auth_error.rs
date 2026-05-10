use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Error)]
pub enum AuthError {
    #[error("Authentication failed: {0}")]
    AuthFailed(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Authentication is not enabled on this cluster")]
    AuthNotEnabled,

    #[error("User '{0}' not found")]
    UserNotFound(String),

    #[error("Role '{0}' not found")]
    RoleNotFound(String),

    #[error("User '{0}' already exists")]
    UserAlreadyExists(String),

    #[error("Role '{0}' already exists")]
    RoleAlreadyExists(String),

    #[error("Invalid permission type '{0}' — expected 'read', 'write', or 'readwrite'")]
    InvalidPermissionType(String),

    #[error("Connection '{0}' not found")]
    ConnectionNotFound(String),

    #[error("ETCD error: {0}")]
    EtcdError(String),
}

impl From<AuthError> for String {
    fn from(err: AuthError) -> Self {
        err.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_failed_display() {
        let err = AuthError::AuthFailed("bad creds".to_string());
        assert_eq!(err.to_string(), "Authentication failed: bad creds");
    }

    #[test]
    fn test_permission_denied_display() {
        let err = AuthError::PermissionDenied("no access".to_string());
        assert_eq!(err.to_string(), "Permission denied: no access");
    }

    #[test]
    fn test_auth_not_enabled_display() {
        let err = AuthError::AuthNotEnabled;
        assert_eq!(
            err.to_string(),
            "Authentication is not enabled on this cluster"
        );
    }

    #[test]
    fn test_user_not_found_display() {
        let err = AuthError::UserNotFound("alice".to_string());
        assert_eq!(err.to_string(), "User 'alice' not found");
    }

    #[test]
    fn test_role_not_found_display() {
        let err = AuthError::RoleNotFound("admin".to_string());
        assert_eq!(err.to_string(), "Role 'admin' not found");
    }

    #[test]
    fn test_user_already_exists_display() {
        let err = AuthError::UserAlreadyExists("bob".to_string());
        assert_eq!(err.to_string(), "User 'bob' already exists");
    }

    #[test]
    fn test_role_already_exists_display() {
        let err = AuthError::RoleAlreadyExists("ops".to_string());
        assert_eq!(err.to_string(), "Role 'ops' already exists");
    }

    #[test]
    fn test_invalid_permission_type_display() {
        let err = AuthError::InvalidPermissionType("admin".to_string());
        assert_eq!(
            err.to_string(),
            "Invalid permission type 'admin' — expected 'read', 'write', or 'readwrite'"
        );
    }

    #[test]
    fn test_connection_not_found_display() {
        let err = AuthError::ConnectionNotFound("conn-1".to_string());
        assert_eq!(err.to_string(), "Connection 'conn-1' not found");
    }

    #[test]
    fn test_etcd_error_display() {
        let err = AuthError::EtcdError("something broke".to_string());
        assert_eq!(err.to_string(), "ETCD error: something broke");
    }

    #[test]
    fn test_from_auth_error_for_string() {
        let err = AuthError::AuthFailed("test".to_string());
        let s: String = err.into();
        assert_eq!(s, "Authentication failed: test");
    }
}
