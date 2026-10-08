export function shouldHandleAuthTransition(event, currentUserId, nextUserId) {
  if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return false
  if (event === 'SIGNED_IN') return currentUserId !== nextUserId
  return event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY'
}
