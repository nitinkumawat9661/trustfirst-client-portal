import store from "../../content/store.json"
import ui from "../../content/ui.json"
import errors from "../../content/errors.json"

export const storeContent = store
export const uiContent = ui
export const errorMessages = errors as Record<string, string>
