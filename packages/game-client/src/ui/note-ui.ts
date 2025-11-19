export class NoteUI {
    private container: HTMLDivElement;
    private contentElement: HTMLDivElement;
    private titleElement: HTMLHeadingElement;
    private isVisibleState: boolean = false;

    private onToggleSound: () => void;

    constructor(onToggleSound: () => void) {
        this.onToggleSound = onToggleSound;
        this.container = document.createElement("div");
        this.container.style.position = "absolute";
        this.container.style.top = "50%";
        this.container.style.left = "50%";
        this.container.style.transform = "translate(-50%, -50%)";
        this.container.style.width = "400px";
        this.container.style.height = "500px";
        this.container.style.backgroundColor = "transparent"; // Transparent for custom bg
        this.container.style.color = "#333";
        this.container.style.padding = "40px";
        this.container.style.boxShadow = "none"; // Remove box shadow if using irregular shape
        this.container.style.borderRadius = "0";
        this.container.style.fontFamily = "'Courier New', Courier, monospace";
        this.container.style.zIndex = "1000";
        this.container.style.display = "none";
        this.container.style.flexDirection = "column";
        this.container.style.overflowY = "auto";
        this.container.style.border = "none";

        // Paper texture effect
        this.container.style.backgroundImage = "url('/ui/scroll_bg.png')";
        this.container.style.backgroundSize = "cover";
        this.container.style.backgroundRepeat = "no-repeat";

        this.titleElement = document.createElement("h2");
        this.titleElement.style.textAlign = "center";
        this.titleElement.style.marginBottom = "20px";
        this.titleElement.style.borderBottom = "2px solid #333";
        this.titleElement.style.paddingBottom = "10px";
        this.container.appendChild(this.titleElement);

        this.contentElement = document.createElement("div");
        this.contentElement.style.lineHeight = "1.6";
        this.contentElement.style.whiteSpace = "pre-wrap"; // Preserve formatting
        this.container.appendChild(this.contentElement);

        const closeButton = document.createElement("button");
        closeButton.textContent = "Close (ESC)";
        closeButton.style.marginTop = "auto";
        closeButton.style.padding = "10px";
        closeButton.style.cursor = "pointer";
        closeButton.style.backgroundColor = "#333";
        closeButton.style.color = "#fff";
        closeButton.style.border = "none";
        closeButton.style.fontFamily = "inherit";
        closeButton.onclick = () => this.hide();
        this.container.appendChild(closeButton);

        document.body.appendChild(this.container);
    }

    public show(title: string, content: string): void {
        this.titleElement.textContent = title;
        this.contentElement.textContent = content;
        this.container.style.display = "flex";
        this.isVisibleState = true;
        this.onToggleSound();
    }

    public hide(): void {
        if (this.isVisibleState) {
            this.container.style.display = "none";
            this.isVisibleState = false;
            this.onToggleSound();
        }
    }

    public isVisible(): boolean {
        return this.isVisibleState;
    }
}
