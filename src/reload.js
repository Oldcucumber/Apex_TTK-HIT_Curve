// After a redeploy an open tab still references the previous build's chunk names, which no
// longer exist. Reload once to pick up the new build instead of showing a blank view.
const KEY = 'apex-reloaded-at'

/** Reload the page unless it was already reloaded for this reason in the last 10 s. */
export const reloadOnce = () => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 10000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false // no storage: never risk a reload loop
  }
  location.reload()
  return true
}
