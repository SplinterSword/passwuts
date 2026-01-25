import browser from "webextension-polyfill"

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "AUTOFILL_CREDENTIALS") return

  const { username, password } = msg.payload

  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>("input")
  ).filter(
    (i) =>
      i.offsetParent !== null && // visible
      !i.disabled &&
      !i.readOnly
  )

  const passwordInputs = inputs.filter(
    (i) => i.type === "password"
  )

  if (!passwordInputs.length) {
    return { error: "No password field found" }
  }

  const passwordInput = passwordInputs[0]

  const usernameCandidates = inputs.filter((i) => {
    if (i === passwordInput) return false
    if (i.type === "hidden") return false

    const haystack = `${i.name} ${i.id} ${i.placeholder}`.toLowerCase()

    return (
      i.type === "email" ||
      haystack.includes("email") ||
      haystack.includes("user") ||
      haystack.includes("login") ||
      haystack.includes("account")
    )
  })

  const usernameInput =
    usernameCandidates.length > 0
      ? usernameCandidates[0]
      : null

  // Fill values
  if (usernameInput && username) {
    fillInput(usernameInput, username)
  }

  fillInput(passwordInput, password)
})

function fillInput(input: HTMLInputElement, value: string) {
  input.focus()
  input.value = value

  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
}
