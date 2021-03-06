import lzString from "lz-string";
import { Examples } from "./constants";

export const decodeCode = (code: string | null): string => {
  if (!code) {
    return ""
  }
  return lzString.decompressFromEncodedURIComponent(code)
}

export const runCode = async (code: string): Promise<APIResponse> => {
  const resp = await fetch("/api/v1/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      code,
    })
  })
  if (!resp.ok) {
    if (resp.headers.get("Content-Type")?.includes("application/json")) {
      const error = await resp.json()
      throw new Error(error.error)
    }
    throw new Error("Execution was not successfull, please try again in a few minutes...")
  }
  return await resp.json()
}

export const trackEvent = (): void => {
  // @ts-ignore
  if (window.gtag && process.env.NODE_ENV === "production") {
    // @ts-ignore
    window.gtag('event', "execute", {
      'event_category': "engagement",
    });
  }
}

const fetchSharedCode = async (code: string): Promise<string | null> => {
  const resp = await fetch(`/api/v1/share/get/${code}`)
  if (!resp.ok) {
    return null
  }
  const body = await resp.json()
  return body?.code
}

export const determineCode = async (setCode: ((code: string) => void)): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const localStorageCode = window.localStorage.getItem("code")
  // TODO: remove (if: code) after a couple of months. Was kept for backwards compatibility
  if (urlParams.has("code")) {
    const newCode = decodeCode(urlParams.get("code"))
    return setCode(newCode)
  } else if (urlParams.has("s")) {
    const key = urlParams.get("s")
    if (key) {
      const sharedCode = await fetchSharedCode(key)
      if (sharedCode) {
        return setCode(sharedCode)
      }
    }
  } else if (urlParams.has("e")) {
    const id = urlParams.get("e")
    const example = Examples.find(example => example.id === id)
    if (example) {
      return setCode(example.code)
    }
  } else if (localStorageCode) {
    return setCode(localStorageCode)
  }
  // Fallback
  setCode(Examples[0].code)
}