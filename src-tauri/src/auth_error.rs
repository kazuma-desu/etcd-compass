use thiserror::Error;

#[derive(Debug, Clone, Error)]
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
