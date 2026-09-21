import { createApp, h, ref } from "vue";

type UiModeSystemApi = {
    getActiveUiMode: () => { getName: () => string };
    getUiModeNamesList: () => string[];
    setActiveUiModeByName: (name: string) => void;
};

export function mountVuePilot(): void {
    const mountPoint = document.getElementById("vuePilotMount");
    if (mountPoint === null) {
        return;
    }

    const uiModeSystem = (window as unknown as { UiModeSystem: UiModeSystemApi }).UiModeSystem;
    if (typeof uiModeSystem === "undefined") {
        return;
    }

    const selectedMode = ref(uiModeSystem.getActiveUiMode().getName());

    createApp({
        setup() {
            const changeMode = (event: Event): void => {
                const select = event.target as HTMLSelectElement;
                uiModeSystem.setActiveUiModeByName(select.value);
                selectedMode.value = select.value;
                document.dispatchEvent(new CustomEvent("eagle:settings-mode-changed"));
            };

            return () => h("div", { id: "uiModeDiv" }, [
                h("span", "UiMode:"),
                h("select", {
                    class: "form-control",
                    id: "settingUserInterfaceModeValue",
                    placeholder: "uiMode",
                    value: selectedMode.value,
                    onChange: changeMode,
                }, uiModeSystem.getUiModeNamesList().map((name) => h("option", { value: name }, name))),
            ]);
        },
    }).mount(mountPoint);
}