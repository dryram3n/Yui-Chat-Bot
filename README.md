# Yui Chat Bot

## Description

Yui Chat Bot is an interactive desktop application featuring Yui, an AI character powered by Google's Gemini API. Experience engaging conversations, watch Yui's personality evolve, and explore a dynamic relationship system. The application is built with Electron, allowing for a cross-platform desktop experience.

This project was developed to explore AI-driven character interaction, dynamic personality systems, and local data persistence in a desktop application.

## Features

*   **AI-Powered Conversations:** Engage in natural conversations with Yui, driven by the Google Gemini AI model.
*   **Evolving Personality:** Yui's personality (shyness, sarcasm, playfulness, patience, openness) changes based on your interactions.
*   **Dynamic Relationship:** Build trust and affection with Yui, progressing through different friendship stages.
*   **Memory System:**
    *   **Short-Term Memory:** Remembers recent turns in the conversation.
    *   **Long-Term Memory:** Stores user facts, key conversations, emotional moments, and Yui's own experiences.
    *   **Knowledge Graph:** Builds a semantic understanding of entities and relationships mentioned.
*   **Emotional State Tracking:** Yui's mood and reactions are influenced by the conversation's sentiment and your relationship.
*   **User Preferences:** Yui can remember user's stated preferences (e.g., favorite food, color).
*   **Proactive Engagement:** Yui can sometimes initiate topics based on her memories of the user.
*   **Customizable Themes:** Choose from multiple visual themes (Dark, Light, Cyberpunk, OLED, Ocean, Retro, etc.).
*   **Dashboard:** View statistics like affection and trust levels over time, key interactions, and relationship milestones.
*   **Settings Panel:**
    *   Manage your Gemini API Key.
    *   Change themes and application resolution.
    *   Set your display name.
    *   View application logs.
*   **Markdown Support:** Messages from Yui can include formatted text like bold, italics, code blocks, and lists.
*   **Local Data Persistence:** All Yui data, settings, and logs are stored locally on your machine.

## Tech Stack

*   **Framework:** Electron
*   **AI Model:** Google Gemini Pro (via `@google/genai` SDK)
*   **Language:** JavaScript (Node.js for backend, Vanilla JS for frontend)
*   **Frontend:** HTML, CSS
*   **NLP (Natural Language Processing):** Compromise.js
*   **Charting:** Chart.js
*   **Build Tool:** Electron Forge
*   **Logging:** Custom file-based logger

## Project Structure

A brief overview of key files and folders:

*   `main.js`: The main Electron process. Handles window creation, IPC, and backend logic like API calls and data storage.
*   `preload.js`: Bridges the main process and renderer process securely, exposing specific Node.js/Electron functionalities.
*   `index.html`: The main HTML file for the application's UI.
*   `css/`: Contains stylesheets.
    *   `styles.css`: Main application styles and theme definitions.
    *   `markdown-styles.css`: Styles for rendering Markdown content.
*   `js/`: Contains frontend JavaScript files.
    *   `renderer.js`: Handles all frontend logic, DOM manipulation, chat interactions, and communication with the main process.
    *   `memory-manager.js`: Manages Yui's long-term memory, including the knowledge graph.
    *   `markdown-formatter.js`: Converts Markdown text to HTML.
    *   `logger.js`: (Used by `main.js`) A simple file logger.
*   `data/`: (Created automatically at runtime in the project root during development, or in the app's user data directory when packaged) Stores:
    *   `yuiData.json`: Yui's personality, memory, and relationship data.
    *   `settings.json`: User settings like theme, API key, and resolution.
    *   `logs/app.log`: Application logs.
*   `package.json`: Defines project metadata, dependencies, and scripts.
*   `forge.config.js`: Configuration for Electron Forge (building and packaging).

## Setup and Installation (for Development)

These instructions are for setting up the project in a development environment like Visual Studio Code.

### Prerequisites

*   **Node.js:** LTS version recommended (e.g., v18.x or v20.x). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm:** Comes bundled with Node.js.
*   **Git:** For cloning the repository. Download from [git-scm.com](https://git-scm.com/).
*   **A Code Editor:** Visual Studio Code is recommended.

### Installation Steps

1.  **Clone the repository:**
    Open your terminal or command prompt and run:
    ```bash
    git clone https://github.com/your-username/yui-chat-bot.git
    cd yui-chat-bot
    ```
    (Replace `https://github.com/your-username/yui-chat-bot.git` with the actual repository URL if you've forked it or it's hosted elsewhere.)

2.  **Install dependencies:**
    This will download all the necessary packages defined in `package.json`.
    ```bash
    npm install
    ```

3.  **Obtain a Google Gemini API Key:**
    Yui Chat Bot uses the Google Gemini API to power its conversations. You'll need your own API key.
    *   Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   Sign in with your Google account.
    *   Create a new API key.
    *   **Important:** Keep your API key confidential. Do not commit it to your repository.

4.  **Configure the API Key in the Application:**
    *   Once you have your API key, run the application (see next step).
    *   Navigate to the "Settings" tab within the application.
    *   Enter your Gemini API Key in the designated field and click "Save Key".
    *   The API key is stored locally in the `data/settings.json` file and is not synced.

### Running the Application (Development Mode)

To start the application in development mode with hot-reloading (if configured by Electron Forge defaults):

```bash
npm start
```

This command will launch the Electron application. Any changes you make to the frontend code should automatically reload the application. Changes to `main.js` might require a manual restart.

### Building the Application (for Distribution)

Electron Forge is used to package the application for different platforms.

*   To package the application (creates distributables in the `out` folder without making an installer):
    ```bash
    npm run package
    ```
*   To make an installer for your current OS:
    ```bash
    npm run make
    ```
    This will create installers (e.g., `.exe` for Windows, `.dmg` for macOS, `.deb` for Debian-based Linux) in the `out/make` folder. Refer to `forge.config.js` for specific maker configurations.

## Usage

1.  **Launch the application:** Either by `npm start` (development) or by running the built executable.
2.  **Set API Key:** If it's your first time, go to `Settings`, enter your Gemini API Key, and save it. Also, set your desired user name.
3.  **Chat:** Navigate to the `Chat` tab to start talking with Yui. Type your message and press Enter or click "Send".
4.  **Dashboard:** Visit the `Dashboard` tab to see visualizations of Yui's affection and trust levels, and other key metrics.
5.  **Settings:**
    *   Change themes.
    *   Adjust window resolution (requires app restart or window resize to fully apply if not handled dynamically by the OS).
    *   View application logs under the "Logs" sub-tab in Settings. This can be helpful for troubleshooting.
    *   Reset all Yui data if you want to start fresh.

## AI Disclosure

This project, Yui Chat Bot, was developed with the assistance of AI programming tools, including GitHub Copilot. The AI helped with boilerplate code generation, suggesting solutions, debugging, and writing documentation. The core logic, design, and feature implementation were directed by the human developer, Thromblo.

## Contributing

Currently, this is a personal project. However, if you have suggestions or find bugs, feel free to open an issue on the GitHub repository.

## License

This project is licensed under the MIT License. See the `LICENSE` file (if present) or `package.json` for more details.

---
*Authored by Thromblo*
// filepath: README.md
# Yui Chat Bot

## Description

Yui Chat Bot is an interactive desktop application featuring Yui, an AI character powered by Google's Gemini API. Experience engaging conversations, watch Yui's personality evolve, and explore a dynamic relationship system. The application is built with Electron, allowing for a cross-platform desktop experience.

This project was developed to explore AI-driven character interaction, dynamic personality systems, and local data persistence in a desktop application.

## Features

*   **AI-Powered Conversations:** Engage in natural conversations with Yui, driven by the Google Gemini AI model.
*   **Evolving Personality:** Yui's personality (shyness, sarcasm, playfulness, patience, openness) changes based on your interactions.
*   **Dynamic Relationship:** Build trust and affection with Yui, progressing through different friendship stages.
*   **Memory System:**
    *   **Short-Term Memory:** Remembers recent turns in the conversation.
    *   **Long-Term Memory:** Stores user facts, key conversations, emotional moments, and Yui's own experiences.
    *   **Knowledge Graph:** Builds a semantic understanding of entities and relationships mentioned.
*   **Emotional State Tracking:** Yui's mood and reactions are influenced by the conversation's sentiment and your relationship.
*   **User Preferences:** Yui can remember user's stated preferences (e.g., favorite food, color).
*   **Proactive Engagement:** Yui can sometimes initiate topics based on her memories of the user.
*   **Customizable Themes:** Choose from multiple visual themes (Dark, Light, Cyberpunk, OLED, Ocean, Retro, etc.).
*   **Dashboard:** View statistics like affection and trust levels over time, key interactions, and relationship milestones.
*   **Settings Panel:**
    *   Manage your Gemini API Key.
    *   Change themes and application resolution.
    *   Set your display name.
    *   View application logs.
*   **Markdown Support:** Messages from Yui can include formatted text like bold, italics, code blocks, and lists.
*   **Local Data Persistence:** All Yui data, settings, and logs are stored locally on your machine.

## Tech Stack

*   **Framework:** Electron
*   **AI Model:** Google Gemini Pro (via `@google/genai` SDK)
*   **Language:** JavaScript (Node.js for backend, Vanilla JS for frontend)
*   **Frontend:** HTML, CSS
*   **NLP (Natural Language Processing):** Compromise.js
*   **Charting:** Chart.js
*   **Build Tool:** Electron Forge
*   **Logging:** Custom file-based logger

## Project Structure

A brief overview of key files and folders:

*   `main.js`: The main Electron process. Handles window creation, IPC, and backend logic like API calls and data storage.
*   `preload.js`: Bridges the main process and renderer process securely, exposing specific Node.js/Electron functionalities.
*   `index.html`: The main HTML file for the application's UI.
*   `css/`: Contains stylesheets.
    *   `styles.css`: Main application styles and theme definitions.
    *   `markdown-styles.css`: Styles for rendering Markdown content.
*   `js/`: Contains frontend JavaScript files.
    *   `renderer.js`: Handles all frontend logic, DOM manipulation, chat interactions, and communication with the main process.
    *   `memory-manager.js`: Manages Yui's long-term memory, including the knowledge graph.
    *   `markdown-formatter.js`: Converts Markdown text to HTML.
    *   `logger.js`: (Used by `main.js`) A simple file logger.
*   `data/`: (Created automatically at runtime in the project root during development, or in the app's user data directory when packaged) Stores:
    *   `yuiData.json`: Yui's personality, memory, and relationship data.
    *   `settings.json`: User settings like theme, API key, and resolution.
    *   `logs/app.log`: Application logs.
*   `package.json`: Defines project metadata, dependencies, and scripts.
*   `forge.config.js`: Configuration for Electron Forge (building and packaging).

## Setup and Installation (for Development)

These instructions are for setting up the project in a development environment like Visual Studio Code.

### Prerequisites

*   **Node.js:** LTS version recommended (e.g., v18.x or v20.x). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm:** Comes bundled with Node.js.
*   **Git:** For cloning the repository. Download from [git-scm.com](https://git-scm.com/).
*   **A Code Editor:** Visual Studio Code is recommended.

### Installation Steps

1.  **Clone the repository:**
    Open your terminal or command prompt and run:
    ```bash
    git clone https://github.com/your-username/yui-chat-bot.git
    cd yui-chat-bot
    ```
    (Replace `https://github.com/your-username/yui-chat-bot.git` with the actual repository URL if you've forked it or it's hosted elsewhere.)

2.  **Install dependencies:**
    This will download all the necessary packages defined in `package.json`.
    ```bash
    npm install
    ```

3.  **Obtain a Google Gemini API Key:**
    Yui Chat Bot uses the Google Gemini API to power its conversations. You'll need your own API key.
    *   Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   Sign in with your Google account.
    *   Create a new API key.
    *   **Important:** Keep your API key confidential. Do not commit it to your repository.

4.  **Configure the API Key in the Application:**
    *   Once you have your API key, run the application (see next step).
    *   Navigate to the "Settings" tab within the application.
    *   Enter your Gemini API Key in the designated field and click "Save Key".
    *   The API key is stored locally in the `data/settings.json` file and is not synced.

### Running the Application (Development Mode)

To start the application in development mode with hot-reloading (if configured by Electron Forge defaults):

```bash
npm start
```

This command will launch the Electron application. Any changes you make to the frontend code should automatically reload the application. Changes to `main.js` might require a manual restart.

### Building the Application (for Distribution)

Electron Forge is used to package the application for different platforms.

*   To package the application (creates distributables in the `out` folder without making an installer):
    ```bash
    npm run package
    ```
*   To make an installer for your current OS:
    ```bash
    npm run make
    ```
    This will create installers (e.g., `.exe` for Windows, `.dmg` for macOS, `.deb` for Debian-based Linux) in the `out/make` folder. Refer to `forge.config.js` for specific maker configurations.

## Usage

1.  **Launch the application:** Either by `npm start` (development) or by running the built executable.
2.  **Set API Key:** If it's your first time, go to `Settings`, enter your Gemini API Key, and save it. Also, set your desired user name.
3.  **Chat:** Navigate to the `Chat` tab to start talking with Yui. Type your message and press Enter or click "Send".
4.  **Dashboard:** Visit the `Dashboard` tab to see visualizations of Yui's affection and trust levels, and other key metrics.
5.  **Settings:**
    *   Change themes.
    *   Adjust window resolution (requires app restart or window resize to fully apply if not handled dynamically by the OS).
    *   View application logs under the "Logs" sub-tab in Settings. This can be helpful for troubleshooting.
    *   Reset all Yui data if you want to start fresh.

## AI Disclosure

This project, Yui Chat Bot, was developed with the assistance of AI programming tools, including GitHub Copilot. The AI helped with boilerplate code generation, suggesting solutions, debugging, and writing documentation. The core logic, design, and feature implementation were directed by the human developer, Thromblo.

## Contributing

Currently, this is a personal project. However, if you have suggestions or find bugs, feel free to open an issue on the GitHub repository.

## License

This project is licensed under the MIT License. See the `LICENSE` file (if present) or `package.json` for more details.

---
*Authored by Thromblo*