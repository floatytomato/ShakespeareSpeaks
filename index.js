document.addEventListener("DOMContentLoaded", () => {
    // Session ID setup
    let sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
        sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        sessionStorage.setItem("sessionId", sessionId);
    }

    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers["X-Session-ID"] = sessionId;
        return originalFetch(url, options);
    };

    let currentUser = null;

    function logSessionEvent(eventType, details = {}) {
        const clientMetadata = {
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            language: navigator.language,
            platform: navigator.platform,
            url: window.location.href,
            referrer: document.referrer
        };
        const combinedMetadata = Object.assign({}, clientMetadata, details.metadata || {});

        const payload = {
            session_id: sessionId,
            user_id: currentUser ? currentUser.id : null,
            event_type: eventType,
            query: details.query || null,
            page_scrolled_to: details.page_scrolled_to || null,
            location: Intl.DateTimeFormat().resolvedOptions().timeZone,
            metadata: JSON.stringify(combinedMetadata)
        };
        
        originalFetch("/api/session/log", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Failed to send session log:", err));
    }

    // Log initial page load event
    logSessionEvent("session_start");

    // Auth DOM Elements
    const btnOpenLogin = document.getElementById("btn-open-login");
    const btnOpenRegister = document.getElementById("btn-open-register");
    const btnLogout = document.getElementById("btn-logout");
    const loginModal = document.getElementById("login-modal");
    const registerModal = document.getElementById("register-modal");
    const closeLoginBtn = document.getElementById("close-login-btn");
    const closeRegisterBtn = document.getElementById("close-register-btn");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const loginErrorMsg = document.getElementById("login-error-msg");
    const registerErrorMsg = document.getElementById("register-error-msg");
    const userWelcomeText = document.getElementById("user-welcome-text");
    const userRoleText = document.getElementById("user-role-text");
    const authButtonsContainer = document.getElementById("auth-buttons-container");
    const loggedInActions = document.getElementById("logged-in-actions");
    const loggedUserName = document.getElementById("logged-user-name");
    const sidebarUserTopics = document.getElementById("sidebar-user-topics");

    // Modal Control Event Listeners
    btnOpenLogin.addEventListener("click", () => {
        loginErrorMsg.style.display = "none";
        loginForm.reset();
        loginModal.style.display = "flex";
    });

    btnOpenRegister.addEventListener("click", () => {
        registerErrorMsg.style.display = "none";
        registerForm.reset();
        registerModal.style.display = "flex";
    });

    closeLoginBtn.addEventListener("click", () => {
        loginModal.style.display = "none";
    });

    closeRegisterBtn.addEventListener("click", () => {
        registerModal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target === loginModal) loginModal.style.display = "none";
        if (e.target === registerModal) registerModal.style.display = "none";
    });

    // Form Submissions
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginErrorMsg.style.display = "none";
        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value;
        
        try {
            const res = await window.fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Login failed.");
            }
            
            currentUser = data.user;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            updateUserUI();
            loginModal.style.display = "none";
            logSessionEvent("auth_login", { metadata: { username } });
        } catch (err) {
            loginErrorMsg.textContent = err.message;
            loginErrorMsg.style.display = "block";
        }
    });

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        registerErrorMsg.style.display = "none";
        const username = document.getElementById("register-username").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        
        const checkedCheckboxes = document.querySelectorAll('input[name="interest-topic"]:checked');
        const topics = Array.from(checkedCheckboxes).map(cb => cb.value);
        
        try {
            const res = await window.fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password, topics })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Registration failed.");
            }
            
            currentUser = data.user;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            updateUserUI();
            registerModal.style.display = "none";
            logSessionEvent("auth_register", { metadata: { username, email, topics } });
        } catch (err) {
            registerErrorMsg.textContent = err.message;
            registerErrorMsg.style.display = "block";
        }
    });

    btnLogout.addEventListener("click", () => {
        logSessionEvent("auth_logout", { metadata: { username: currentUser ? currentUser.username : null } });
        currentUser = null;
        localStorage.removeItem("currentUser");
        updateUserUI();
    });

    function updateUserUI() {
        if (currentUser) {
            userWelcomeText.textContent = `Welcome, ${currentUser.username}`;
            if (loggedUserName) loggedUserName.textContent = currentUser.username;
            userRoleText.style.display = "none";
            authButtonsContainer.style.display = "none";
            loggedInActions.style.display = "flex";
            sidebarUserTopics.style.display = "none";
        } else {
            userWelcomeText.textContent = "Welcome, Guest";
            if (loggedUserName) loggedUserName.textContent = "";
            userRoleText.style.display = "none";
            authButtonsContainer.style.display = "flex";
            loggedInActions.style.display = "none";
            sidebarUserTopics.style.display = "none";
        }
    }

    // Restore user from localStorage on startup
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUserUI();
        } catch (e) {
            localStorage.removeItem("currentUser");
        }
    } else {
        updateUserUI();
    }

    // Scroll Logging Debounced
    let scrollTimeout;
    window.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const activePanel = document.querySelector(".view-panel.active");
            if (!activePanel) return;
            
            const panelId = activePanel.id;
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            const percent = scrollHeight > clientHeight ? Math.round((scrollTop / (scrollHeight - clientHeight)) * 100) : 0;
            
            logSessionEvent("scroll", {
                page_scrolled_to: `${panelId} (scroll: ${percent}%, ${scrollTop}px)`,
                metadata: {
                    scrollTop,
                    scrollHeight,
                    clientHeight,
                    percent
                }
            });
        }, 1500);
    });

    // State management
    let worksList = [];
    let currentWork = null;
    let chaptersList = [];
    let chatHistory = [];
    let apiKeyLoaded = false;
    let currentLoadedText = "";
    let currentSearchResults = "";
    
    // Check if running on localhost/development
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocal) {
        const navSettings = document.getElementById("nav-settings");
        if (navSettings) {
            navSettings.style.display = "none";
        }
    }

    // DOM Elements
    const navButtons = document.querySelectorAll(".nav-item");
    const viewPanels = document.querySelectorAll(".view-panel");
    const keyStatusIndicator = document.getElementById("key-status-indicator");

    // Explorer Elements
    const genreFilter = document.getElementById("work-genre-filter");
    const explorerWorksList = document.getElementById("explorer-works-list");
    const mobileWorkSelect = document.getElementById("mobile-work-select");
    const navigationSubpanel = document.getElementById("navigation-subpanel");
    const navigatorTitle = document.getElementById("navigator-title");
    const actSelect = document.getElementById("act-select");
    const sceneSelect = document.getElementById("scene-select");
    const sonnetSelector = document.getElementById("sonnet-selector");
    const sonnetSelect = document.getElementById("sonnet-select");
    const actSceneSelectors = document.getElementById("act-scene-selectors");
    const readerWorkTitle = document.getElementById("reader-work-title");
    const readerLocationTitle = document.getElementById("reader-location-title");
    const readerGenreBadge = document.getElementById("reader-genre-badge");
    const readerContentContainer = document.getElementById("reader-content-container");
    const sendToStudioBtn = document.getElementById("send-to-studio-btn");
    const copyReaderTextBtn = document.getElementById("copy-reader-text-btn");

    // Analysis Studio Elements
    const studioWork1 = document.getElementById("studio-work-1");
    const studioWork1Nav = document.getElementById("studio-work-1-nav");
    const studioAct1 = document.getElementById("studio-act-1");
    const studioScene1 = document.getElementById("studio-scene-1");
    const compareCheckbox = document.getElementById("compare-checkbox");
    const comparativeSelectionContainer = document.getElementById("comparative-selection-container");
    const studioWork2 = document.getElementById("studio-work-2");
    const studioSonnet2Group = document.getElementById("studio-sonnet-2-group");
    const studioSonnet2 = document.getElementById("studio-sonnet-2");
    const studioTopic = document.getElementById("studio-topic");
    const studioGuidelines = document.getElementById("studio-guidelines");
    const analysisForm = document.getElementById("analysis-form");
    const essayOutputContent = document.getElementById("essay-output-content");
    const copyEssayBtn = document.getElementById("copy-essay-btn");

    // Chat Elements
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatMessages = document.getElementById("chat-messages");
    const copyChatBtn = document.getElementById("copy-chat-btn");
    const clearChatBtn = document.getElementById("clear-chat-btn");

    // Search Elements
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search-input");
    const searchGenreFilter = document.getElementById("search-genre-filter");
    const searchResultsInfo = document.getElementById("search-results-info");
    const searchResultsList = document.getElementById("search-results-list");
    const copySearchResultsBtn = document.getElementById("copy-search-results-btn");

    // Settings Elements
    const settingsForm = document.getElementById("settings-form");
    const settingsApiKey = document.getElementById("settings-api-key");
    const toggleKeyVisibility = document.getElementById("toggle-key-visibility");
    const diagDbStatus = document.getElementById("diag-db-status");
    const diagHistoryStatus = document.getElementById("diag-history-status");

    // News state and elements
    let newsList = [];
    let newsChatHistory = [];
    let activeNewsStory = null;
    const newsShelf = document.getElementById("news-shelf");
    const refreshNewsBtn = document.getElementById("refresh-news-btn");
    const newsChatForm = document.getElementById("news-chat-form");
    const newsChatInput = document.getElementById("news-chat-input");
    const newsChatMessages = document.getElementById("news-chat-messages");

    // Climate state and elements
    let climateList = [];
    let climateChatHistory = [];
    let activeClimateStory = null;
    const climateShelf = document.getElementById("climate-shelf");
    const refreshClimateBtn = document.getElementById("refresh-climate-btn");
    const climateChatForm = document.getElementById("climate-chat-form");
    const climateChatInput = document.getElementById("climate-chat-input");
    const climateChatMessages = document.getElementById("climate-chat-messages");

    // API Config
    const API_BASE = ""; // Relative path to local server

    // --- Tab Switching Logic ---
    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetTab = button.getAttribute("data-tab");
            if (targetTab === "settings" && !isLocal) {
                alert("Settings panel is disabled in production.");
                return;
            }
            
            // Toggle buttons
            navButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            
            // Toggle panels
            viewPanels.forEach(panel => panel.classList.remove("active"));
            document.getElementById(`${targetTab}-view`).classList.add("active");
            
            // Log navigation event
            logSessionEvent("nav", { metadata: { tab: targetTab } });
            
            // Special triggers on tab activation
            if (targetTab === "analysis") {
                populateStudioDropdowns();
            }
            if (targetTab === "events") {
                loadTopNews();
            }
            if (targetTab === "climate") {
                loadTopClimateNews();
            }
        });
    });

    // --- Action Button Event Listeners ---
    copyReaderTextBtn.addEventListener("click", () => {
        if (!currentLoadedText) return;
        navigator.clipboard.writeText(currentLoadedText);
        logSessionEvent("copy", { metadata: { source: "reader" } });
        copyReaderTextBtn.textContent = "Copied!";
        setTimeout(() => {
            copyReaderTextBtn.textContent = "Copy Text";
        }, 2000);
    });

    copyChatBtn.addEventListener("click", () => {
        if (chatHistory.length === 0) return;
        const transcript = chatHistory.map(turn => {
            const roleName = turn.role === "user" ? "User" : "Bard";
            return `${roleName}: ${turn.content}`;
        }).join("\n\n");
        navigator.clipboard.writeText(transcript);
        logSessionEvent("copy", { metadata: { source: "chat" } });
        copyChatBtn.textContent = "Copied!";
        setTimeout(() => {
            copyChatBtn.textContent = "Copy Transcript";
        }, 2000);
    });

    clearChatBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear the chat history?")) {
            chatHistory = [];
            logSessionEvent("clear_chat");
            // Clear all except the first welcome message
            const messages = chatMessages.querySelectorAll(".message");
            messages.forEach((msg, idx) => {
                if (idx > 0) msg.remove();
            });
            copyChatBtn.style.display = "none";
            clearChatBtn.style.display = "none";
        }
    });

    copySearchResultsBtn.addEventListener("click", () => {
        if (!currentSearchResults) return;
        navigator.clipboard.writeText(currentSearchResults);
        logSessionEvent("copy", { metadata: { source: "search" } });
        copySearchResultsBtn.textContent = "Copied!";
        setTimeout(() => {
            copySearchResultsBtn.textContent = "Copy Results";
        }, 2000);
    });

    // --- Helper: Markdown to HTML Parser ---
    function renderMarkdown(md) {
        if (!md) return "";
        let html = md;
        
        // Escape HTML to prevent injection, except we keep structure
        html = html
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Blockquotes
        html = html.replace(/^\s*&gt;\s+(.*$)/gim, '<blockquote>$1</blockquote>');
        html = html.replace(/<\/blockquote>\s*<blockquote>/gim, '<br>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        // Italics
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        
        // Bullet Lists
        html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
        // Simple line wraps for consecutive list items (wrap in <ul>)
        // Group list items
        html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
        html = html.replace(/<\/ul>\s*<ul>/gim, ''); // Merge consecutive lists

        // Paragraphs
        html = html.split('\n\n').map(p => {
            const trimmed = p.trim();
            if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<ul') || trimmed.startsWith('<li')) {
                return p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');
        
        return `<div class="essay-content">${html}</div>`;
    }

    // --- Init Diagnostics & API Key Check ---
    async function checkSystemStatus() {
        try {
            const res = await fetch(`${API_BASE}/api/settings/status`);
            if (res.ok) {
                const data = await res.json();
                updateApiKeyIndicator(data.key_status || data.api_key_set);
                if (data.api_key_set) {
                    apiKeyLoaded = true;
                    // Prepopulate key with dots
                    settingsApiKey.value = "••••••••••••••••••••••••••••••••";
                }
            } else {
                updateApiKeyIndicator(false);
            }
        } catch (e) {
            console.error("Failed to fetch settings status:", e);
            updateApiKeyIndicator(false);
            diagDbStatus.textContent = "Offline - Server Disconnected";
            diagDbStatus.className = "diag-value error";
        }
    }

    function updateApiKeyIndicator(isSet) {
        if (isSet) {
            keyStatusIndicator.innerHTML = '<span class="status-dot online"></span><span class="status-text">Gemini API Connected</span>';
        } else {
            keyStatusIndicator.innerHTML = '<span class="status-dot offline"></span><span class="status-text">No API Key Loaded</span>';
        }
    }

    // --- 1. EXPLORER MODULE ---

    // Fetch and display works
    async function loadWorks() {
        try {
            const res = await fetch(`${API_BASE}/api/works`);
            if (!res.ok) throw new Error("Failed to fetch works list");
            worksList = await res.json();
            renderWorksList(worksList);
            populateStudioDropdowns();
        } catch (e) {
            console.error(e);
            explorerWorksList.innerHTML = `<li class="error-msg">Error loading works from local database.</li>`;
        }
    }

    function getGenreName(type) {
        switch(type) {
            case 't': return 'Tragedy';
            case 'c': return 'Comedy';
            case 'h': return 'History';
            case 's': return 'Sonnet';
            case 'p': return 'Poem';
            default: return 'Literature';
        }
    }

    function getGenreClass(type) {
        switch(type) {
            case 't': return 'tragedy';
            case 'c': return 'comedy';
            case 'h': return 'history';
            case 's': return 'sonnets';
            case 'p': return 'poetry';
            default: return '';
        }
    }

    function renderWorksList(works) {
        const selectedGenre = genreFilter.value;
        explorerWorksList.innerHTML = "";
        
        // Reset mobile selector
        mobileWorkSelect.innerHTML = '<option value="">-- Select a Work --</option>';
        
        const filtered = works.filter(w => selectedGenre === "all" || w.genre_type === selectedGenre);
        
        if (filtered.length === 0) {
            explorerWorksList.innerHTML = `<li>No works found.</li>`;
            return;
        }

        filtered.forEach(work => {
            // Render desktop list item
            const li = document.createElement("li");
            li.setAttribute("data-id", work.id);
            li.className = currentWork && currentWork.id === work.id ? "active" : "";
            
            const titleSpan = document.createElement("span");
            titleSpan.textContent = work.title;
            li.appendChild(titleSpan);

            const yearSpan = document.createElement("span");
            yearSpan.className = "work-year";
            yearSpan.textContent = work.year > 0 ? work.year : "N/A";
            li.appendChild(yearSpan);

            li.addEventListener("click", () => {
                document.querySelectorAll("#explorer-works-list li").forEach(el => el.classList.remove("active"));
                li.classList.add("active");
                mobileWorkSelect.value = work.id;
                selectWork(work);
            });

            explorerWorksList.appendChild(li);

            // Render mobile select option
            const opt = document.createElement("option");
            opt.value = work.id;
            opt.textContent = `${work.title} (${work.year > 0 ? work.year : 'N/A'})`;
            mobileWorkSelect.appendChild(opt);
        });

        // Set the active value on the mobile dropdown if currentWork is set
        if (currentWork) {
            mobileWorkSelect.value = currentWork.id;
        }
    }

    genreFilter.addEventListener("change", () => {
        renderWorksList(worksList);
    });

    mobileWorkSelect.addEventListener("change", () => {
        const workId = mobileWorkSelect.value;
        if (!workId) return;
        
        const work = worksList.find(w => w.id === workId);
        if (work) {
            document.querySelectorAll("#explorer-works-list li").forEach(el => {
                if (el.getAttribute("data-id") === workId) {
                    el.classList.add("active");
                } else {
                    el.classList.remove("active");
                }
            });
            selectWork(work);
        }
    });

    async function selectWork(work) {
        currentWork = work;
        readerWorkTitle.textContent = work.long_title || work.title;
        readerGenreBadge.textContent = getGenreName(work.genre_type);
        readerGenreBadge.className = `badge ${getGenreClass(work.genre_type)}`;
        readerLocationTitle.textContent = "Select navigation components to retrieve lines.";
        readerContentContainer.innerHTML = `
            <div class="reader-placeholder">
                <span class="placeholder-icon">📖</span>
                <p>Loading acts and scenes for "${work.title}"...</p>
            </div>
        `;
        sendToStudioBtn.style.display = "none";
        copyReaderTextBtn.style.display = "none";
        currentLoadedText = "";

        // Fetch act/scene divisions (chapters)
        try {
            const res = await fetch(`${API_BASE}/api/works/${work.id}/chapters`);
            if (!res.ok) throw new Error("Failed to load chapters");
            chaptersList = await res.json();
            
            setupNavigator(work.genre_type);
        } catch (e) {
            console.error(e);
            readerContentContainer.innerHTML = `<div class="reader-placeholder"><p>Error loading chapters.</p></div>`;
        }
    }

    function setupNavigator(genre) {
        navigationSubpanel.style.display = "block";
        navigatorTitle.textContent = currentWork.title;

        if (genre === 's') {
            // Sonnets: Show sonnet dropdown
            actSceneSelectors.style.display = "none";
            sonnetSelector.style.display = "grid";
            
            // Populate sonnet select
            sonnetSelect.innerHTML = `<option value="">-- Select Sonnet --</option>`;
            chaptersList.forEach(ch => {
                const opt = document.createElement("option");
                opt.value = ch.chapter_number;
                opt.textContent = `Sonnet ${ch.chapter_number}`;
                sonnetSelect.appendChild(opt);
            });
            
            sonnetSelect.onchange = () => {
                if (sonnetSelect.value) {
                    loadLines(currentWork.id, { sonnet: sonnetSelect.value });
                }
            };
        } else {
            // Plays/Poems: Show Act & Scene dropdowns
            sonnetSelector.style.display = "none";
            actSceneSelectors.style.display = "grid";

            // Extract unique acts (section_numbers)
            const acts = [...new Set(chaptersList.map(ch => ch.section_number))].sort((a,b)=>a-b);
            actSelect.innerHTML = `<option value="">Select Act</option>`;
            acts.forEach(act => {
                const opt = document.createElement("option");
                opt.value = act;
                opt.textContent = `Act ${act}`;
                actSelect.appendChild(opt);
            });

            sceneSelect.innerHTML = `<option value="">Select Scene</option>`;
            sceneSelect.disabled = true;

            actSelect.onchange = () => {
                sceneSelect.innerHTML = `<option value="">Select Scene</option>`;
                if (!actSelect.value) {
                    sceneSelect.disabled = true;
                    return;
                }
                
                sceneSelect.disabled = false;
                // Filter scenes inside selected act
                const scenes = chaptersList.filter(ch => ch.section_number == actSelect.value);
                scenes.forEach(sc => {
                    const opt = document.createElement("option");
                    opt.value = sc.chapter_number;
                    opt.textContent = `Scene ${sc.chapter_number} ${sc.description ? '- ' + sc.description : ''}`;
                    sceneSelect.appendChild(opt);
                });
            };

            sceneSelect.onchange = () => {
                if (actSelect.value && sceneSelect.value) {
                    loadLines(currentWork.id, { act: actSelect.value, scene: sceneSelect.value });
                }
            };
        }
    }

    async function loadLines(workId, params) {
        readerContentContainer.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Retrieving lines from local database...</p>
            </div>
        `;
        copyReaderTextBtn.style.display = "none";
        currentLoadedText = "";
        
        const queryParams = new URLSearchParams();
        if (params.sonnet) queryParams.append("sonnet", params.sonnet);
        if (params.act) queryParams.append("act", params.act);
        if (params.scene) queryParams.append("scene", params.scene);
        
        const url = `${API_BASE}/api/works/${workId}/lines?${queryParams.toString()}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to load text lines");
            const lines = await res.json();
            
            // Set header labels
            if (params.sonnet) {
                readerLocationTitle.textContent = `Sonnet ${params.sonnet}`;
            } else {
                readerLocationTitle.textContent = `Act ${params.act}, Scene ${params.scene}`;
            }
            
            renderLines(lines, currentWork.genre_type);
            
            // Construct plain text for copying
            if (currentWork.genre_type === 's') {
                currentLoadedText = lines.map(l => l.plain_text).join("\n");
            } else {
                currentLoadedText = lines.map(line => {
                    const isStage = line.plain_text.startsWith("[") || line.character_id === "xxx-stage" || !line.character_name;
                    if (isStage) {
                        return line.plain_text;
                    } else {
                        return `${line.character_name}: ${line.plain_text}`;
                    }
                }).join("\n");
            }
            copyReaderTextBtn.style.display = "inline-flex";
            
            // Enable Send to Studio button
            sendToStudioBtn.style.display = "inline-flex";
            sendToStudioBtn.onclick = () => {
                navButtons.forEach(btn => btn.classList.remove("active"));
                document.getElementById("nav-analysis").classList.add("active");
                viewPanels.forEach(panel => panel.classList.remove("active"));
                document.getElementById("analysis-view").classList.add("active");
                
                populateStudioDropdowns();
                
                // Prepopulate form values
                studioWork1.value = workId;
                // Dispatch work change event to populate acts
                const event = new Event('change');
                studioWork1.dispatchEvent(event);
                
                if (currentWork.genre_type === 's') {
                    // It's a sonnet
                    compareCheckbox.checked = true;
                    comparativeSelectionContainer.style.display = "block";
                    studioWork2.value = "sonnets";
                    const event2 = new Event('change');
                    studioWork2.dispatchEvent(event2);
                    studioSonnet2.value = params.sonnet;
                    studioWork1.value = ""; // Clear Work 1 to force sonnet as compare
                } else {
                    studioAct1.value = params.act;
                    const actEvent = new Event('change');
                    studioAct1.dispatchEvent(actEvent);
                    studioScene1.value = params.scene;
                }
            };
        } catch (e) {
            console.error(e);
            readerContentContainer.innerHTML = `<div class="reader-placeholder"><p>Error retrieving lines.</p></div>`;
        }
    }

    function renderLines(lines, genre) {
        readerContentContainer.innerHTML = "";
        
        if (lines.length === 0) {
            readerContentContainer.innerHTML = `<div class="reader-placeholder"><p>No text found for this selection.</p></div>`;
            return;
        }

        if (genre === 's') {
            // Render Sonnet layout
            const div = document.createElement("div");
            div.className = "sonnet-stanza";
            // Stanza is typically single block
            div.textContent = lines[0].plain_text;
            readerContentContainer.appendChild(div);
        } else {
            // Render Play dialogues
            lines.forEach(line => {
                const div = document.createElement("div");
                
                // Check if it's dialogue or stage direction
                const isStage = line.plain_text.startsWith("[") || line.character_id === "xxx-stage" || !line.character_name;
                
                if (isStage) {
                    div.className = "stage-direction";
                    // Clean surrounding braces if they exist to avoid double
                    let txt = line.plain_text;
                    if (txt.startsWith("[") && txt.endsWith("]")) {
                        txt = txt.substring(1, txt.length - 1);
                    }
                    div.textContent = txt;
                } else {
                    div.className = "play-dialogue";
                    
                    const speaker = document.createElement("span");
                    speaker.className = "dialogue-speaker";
                    speaker.textContent = line.character_name;
                    div.appendChild(speaker);

                    const dialogue = document.createElement("span");
                    dialogue.className = "dialogue-text";
                    dialogue.textContent = line.plain_text;
                    div.appendChild(dialogue);
                }
                
                readerContentContainer.appendChild(div);
            });
        }
    }

    // --- 2. ANALYSIS STUDIO MODULE ---

    function populateStudioDropdowns() {
        if (worksList.length === 0) return;

        // Populate Work 1
        if (studioWork1.children.length <= 1) {
            studioWork1.innerHTML = `<option value="">-- Select Primary Work --</option>`;
            worksList.forEach(w => {
                // Skip the combined sonnet container for Work 1 if they want plays
                if (w.id !== "sonnets") {
                    const opt = document.createElement("option");
                    opt.value = w.id;
                    opt.textContent = `${w.title} (${getGenreName(w.genre_type)})`;
                    studioWork1.appendChild(opt);
                }
            });
        }

        // Populate Work 2 (includes Sonnets)
        if (studioWork2.children.length <= 1) {
            studioWork2.innerHTML = `<option value="">-- Select Comparative Work --</option>`;
            worksList.forEach(w => {
                const opt = document.createElement("option");
                opt.value = w.id;
                opt.textContent = `${w.title} (${getGenreName(w.genre_type)})`;
                studioWork2.appendChild(opt);
            });
        }
    }

    // Work 1 Change: fetch acts/scenes
    studioWork1.addEventListener("change", async () => {
        studioAct1.innerHTML = `<option value="">All Acts</option>`;
        studioScene1.innerHTML = `<option value="">All Scenes</option>`;
        studioScene1.disabled = true;

        const workId = studioWork1.value;
        if (!workId) return;

        try {
            const res = await fetch(`${API_BASE}/api/works/${workId}/chapters`);
            const chapters = await res.json();
            
            const acts = [...new Set(chapters.map(ch => ch.section_number))].sort((a,b)=>a-b);
            acts.forEach(act => {
                const opt = document.createElement("option");
                opt.value = act;
                opt.textContent = `Act ${act}`;
                studioAct1.appendChild(opt);
            });

            studioAct1.onchange = () => {
                studioScene1.innerHTML = `<option value="">All Scenes</option>`;
                if (!studioAct1.value) {
                    studioScene1.disabled = true;
                    return;
                }
                studioScene1.disabled = false;
                const scenes = chapters.filter(ch => ch.section_number == studioAct1.value);
                scenes.forEach(sc => {
                    const opt = document.createElement("option");
                    opt.value = sc.chapter_number;
                    opt.textContent = `Scene ${sc.chapter_number}`;
                    studioScene1.appendChild(opt);
                });
            };
        } catch (e) {
            console.error("Failed to fetch chapters for analysis work 1", e);
        }
    });

    // Checkbox compare toggle
    compareCheckbox.addEventListener("change", () => {
        if (compareCheckbox.checked) {
            comparativeSelectionContainer.style.display = "block";
        } else {
            comparativeSelectionContainer.style.display = "none";
            studioWork2.value = "";
            studioSonnet2Group.style.display = "none";
        }
    });

    // Work 2 Change
    studioWork2.addEventListener("change", async () => {
        const workId = studioWork2.value;
        if (workId === "sonnets") {
            studioSonnet2Group.style.display = "block";
            // Populate Sonnet selects
            studioSonnet2.innerHTML = `<option value="">-- Select Sonnet --</option>`;
            // We know there are 154 sonnets
            for (let i = 1; i <= 154; i++) {
                const opt = document.createElement("option");
                opt.value = i;
                opt.textContent = `Sonnet ${i}`;
                studioSonnet2.appendChild(opt);
            }
        } else {
            studioSonnet2Group.style.display = "none";
            studioSonnet2.innerHTML = "";
        }
    });

    // Generate Essay Submit
    analysisForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const payload = {
            work_id_1: studioWork1.value,
            act_1: studioAct1.value ? parseInt(studioAct1.value) : null,
            scene_1: studioScene1.value ? parseInt(studioScene1.value) : null,
            work_id_2: compareCheckbox.checked && studioWork2.value ? studioWork2.value : null,
            sonnet_2: compareCheckbox.checked && studioWork2.value === "sonnets" && studioSonnet2.value ? parseInt(studioSonnet2.value) : null,
            topic: studioTopic.value,
            guidelines: studioGuidelines.value
        };

        logSessionEvent("essay", { query: payload.topic, metadata: { work1: payload.work_id_1, work2: payload.work_id_2 } });

        essayOutputContent.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Retrieving sources & writing essay...</p>
                <p class="subtext">This may take up to 30 seconds to structure the analysis.</p>
            </div>
        `;
        copyEssayBtn.style.display = "none";

        try {
            const res = await fetch(`${API_BASE}/api/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to generate essay.");
            const data = await res.json();
            
            // Render essay in Markdown
            essayOutputContent.innerHTML = renderMarkdown(data.essay);
            copyEssayBtn.style.display = "inline-flex";
            
            // Set copy handler
            copyEssayBtn.onclick = () => {
                navigator.clipboard.writeText(data.essay);
                logSessionEvent("copy", { metadata: { source: "essay" } });
                copyEssayBtn.textContent = "Copied!";
                setTimeout(() => {
                    copyEssayBtn.textContent = "Copy Essay";
                }, 2000);
            };
        } catch (e) {
            console.error(e);
            essayOutputContent.innerHTML = `
                <div class="output-placeholder error">
                    <span class="placeholder-icon">⚠️</span>
                    <p>Error generating essay.</p>
                    <p class="subtext">${e.message || "Please check your server connection or Gemini API key."}</p>
                </div>
            `;
        }
    });

    // --- 3. BARD CHAT MODULE ---

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        chatInput.value = "";
        logSessionEvent("chat", { query: message, metadata: { historyLength: chatHistory.length } });
        
        // Append user bubble
        appendChatBubble("user", message);
        chatHistory.push({ role: "user", content: message });
        
        // Show chat actions
        copyChatBtn.style.display = "inline-flex";
        clearChatBtn.style.display = "inline-flex";
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Append "typing" bubble
        const typingId = appendChatBubble("assistant", `
            <div class="loader-container" style="flex-direction:row; padding:0; height:auto; gap:6px;">
                <div class="loader" style="width:14px; height:14px; border-width:2px;"></div>
                <span style="font-size:12px; color:var(--text-muted);">Consulting the archives...</span>
            </div>
        `);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, history: chatHistory })
            });

            // Remove typing bubble
            const typingBubble = document.getElementById(typingId);
            if (typingBubble) typingBubble.remove();

            if (!res.ok) throw new Error("Failed to retrieve chat response.");
            const data = await res.json();
            
            // Append assistant bubble
            const assistantMsgId = appendChatBubble("assistant", renderMarkdown(data.reply));
            chatHistory.push({ role: "assistant", content: data.reply });
            
            const assistantMsgEl = document.getElementById(assistantMsgId);
            if (assistantMsgEl) {
                chatMessages.scrollTo({
                    top: assistantMsgEl.offsetTop - 12,
                    behavior: "smooth"
                });
            }
        } catch (e) {
            console.error(e);
            const typingBubble = document.getElementById(typingId);
            if (typingBubble) typingBubble.remove();
            
            appendChatBubble("system", `⚠️ Error: Could not connect to the local scholar agent. Verify your backend server is active and API key is set.`);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });

    function appendChatBubble(role, content) {
        const id = `msg-${Date.now()}`;
        const div = document.createElement("div");
        div.className = `message ${role}-message`;
        div.id = id;

        const avatar = document.createElement("div");
        avatar.className = "msg-avatar";
        avatar.textContent = role === "user" ? "🎓" : "🧙‍♂️";
        div.appendChild(avatar);

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        if (role === "user" || role === "system") {
            bubble.textContent = content;
        } else {
            // Render HTML for parsed Markdown from Assistant
            bubble.innerHTML = content;
        }
        div.appendChild(bubble);

        chatMessages.appendChild(div);
        return id;
    }

    // --- 4. GLOBAL SEARCH MODULE ---

    searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const query = searchInput.value.trim();
        if (query.length < 3) {
            alert("Search query must be at least 3 characters.");
            return;
        }
        logSessionEvent("search", { query: query, metadata: { genre: searchGenreFilter.value } });
        
        searchResultsList.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Searching plays and sonnets in the local database...</p>
            </div>
        `;
        searchResultsInfo.textContent = "Searching...";
        copySearchResultsBtn.style.display = "none";
        currentSearchResults = "";

        const genre = searchGenreFilter.value;
        let url = `${API_BASE}/api/search?query=${encodeURIComponent(query)}`;
        if (genre) url += `&genre=${genre}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to search database.");
            const results = await res.json();
            
            renderSearchResults(results, query);
        } catch (e) {
            console.error(e);
            searchResultsList.innerHTML = `<div class="search-placeholder"><p>Error performing search query.</p></div>`;
            searchResultsInfo.textContent = "Error.";
        }
    });

    function renderSearchResults(results, query) {
        searchResultsList.innerHTML = "";
        searchResultsInfo.textContent = `Found ${results.length} occurrences matching "${query}".`;
        copySearchResultsBtn.style.display = "none";
        currentSearchResults = "";
        
        if (results.length === 0) {
            searchResultsList.innerHTML = `
                <div class="search-placeholder">
                    <span class="placeholder-icon">💨</span>
                    <p>No matches found in the corpus. Try another search term.</p>
                </div>
            `;
            return;
        }

        // Build plain text for copying
        let copyText = `Shakespeare Search Results for "${query}" (${results.length} occurrences):\n\n`;
        results.forEach(res => {
            const loc = res.genre_type === 's' ? `Sonnet ${res.chapter_number}` : `Act ${res.section_number}, Scene ${res.chapter_number}`;
            const charInfo = res.character_name ? ` (${res.character_name})` : "";
            copyText += `- [${res.work_title} - ${loc}${charInfo}]: "${res.plain_text}"\n\n`;
        });
        currentSearchResults = copyText;
        copySearchResultsBtn.style.display = "inline-flex";

        results.forEach(res => {
            const li = document.createElement("li");
            li.className = "search-result-card";
            
            const meta = document.createElement("div");
            meta.className = "result-meta";
            
            const workSpan = document.createElement("span");
            workSpan.className = "result-work";
            workSpan.textContent = res.work_title;
            meta.appendChild(workSpan);

            const locSpan = document.createElement("span");
            locSpan.className = "result-location";
            locSpan.textContent = res.genre_type === 's' ? `Sonnet ${res.chapter_number}` : `Act ${res.section_number}, Scene ${res.chapter_number}`;
            meta.appendChild(locSpan);

            if (res.character_name) {
                const charSpan = document.createElement("span");
                charSpan.className = "result-character";
                charSpan.textContent = res.character_name;
                meta.appendChild(charSpan);
            }
            
            li.appendChild(meta);

            const textDiv = document.createElement("div");
            textDiv.className = "result-text";
            
            // Highlight matching word and all active stems using regex
            const sortedStems = (res.stems || [query])
                .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .sort((a, b) => b.length - a.length);
            const pattern = sortedStems.join("|");
            const regex = new RegExp(`(${pattern})`, "gi");
            const highlightedText = res.plain_text.replace(regex, "<mark>$1</mark>");
            textDiv.innerHTML = highlightedText;
            li.appendChild(textDiv);

            // Clicking result jumps to Explorer view and loads the text!
            li.addEventListener("click", () => {
                // Switch tabs
                navButtons.forEach(btn => btn.classList.remove("active"));
                document.getElementById("nav-explorer").classList.add("active");
                viewPanels.forEach(panel => panel.classList.remove("active"));
                document.getElementById("explorer-view").classList.add("active");

                // Locate the work in worksList
                const matchedWork = worksList.find(w => w.id === res.work_id);
                if (matchedWork) {
                    selectWork(matchedWork).then(() => {
                        // After loading chapters, set navigator selects
                        if (res.genre_type === 's') {
                            sonnetSelect.value = res.chapter_number;
                            loadLines(res.work_id, { sonnet: res.chapter_number });
                        } else {
                            actSelect.value = res.section_number;
                            // Trigger act change manually to populate scenes
                            const event = new Event('change');
                            actSelect.dispatchEvent(event);
                            
                            sceneSelect.value = res.chapter_number;
                            loadLines(res.work_id, { act: res.section_number, scene: res.chapter_number });
                        }
                    });
                }
            });

            searchResultsList.appendChild(li);
        });
    }

    // --- 5. SETTINGS MODULE ---

    // Toggle password visibility
    toggleKeyVisibility.addEventListener("click", () => {
        if (settingsApiKey.type === "password") {
            settingsApiKey.type = "text";
            toggleKeyVisibility.textContent = "🙈";
        } else {
            settingsApiKey.type = "password";
            toggleKeyVisibility.textContent = "👁️";
        }
    });

    settingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const key = settingsApiKey.value.trim();
        if (!key) {
            alert("Please enter a valid API Key.");
            return;
        }

        // If user submitted dots (meaning no edit), do nothing
        if (key === "••••••••••••••••••••••••••••••••") {
            alert("No changes made to the current API key.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/settings/api-key`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: key })
            });

            if (!res.ok) throw new Error("Failed to save settings.");
            
            alert("Gemini API settings updated successfully!");
            apiKeyLoaded = true;
            updateApiKeyIndicator(true);
            settingsApiKey.value = "••••••••••••••••••••••••••••••••";
            settingsApiKey.type = "password";
            toggleKeyVisibility.textContent = "👁️";
        } catch (err) {
            alert(`Error updating settings: ${err.message}`);
        }
    });

    // --- CURRENT EVENTS & NEWS MODULE ---
    let newsLoaded = false;

    async function loadTopNews(force = false) {
        if (newsLoaded && !force) return;
        
        newsShelf.innerHTML = `
            <div class="loader-container" style="flex-direction:row; height:120px; gap:8px;">
                <div class="loader" style="width:20px; height:20px; border-width:2px;"></div>
                <span>Loading top current stories...</span>
            </div>
        `;
        
        try {
            const url = force ? `${API_BASE}/api/news/top?force=true` : `${API_BASE}/api/news/top`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch top stories.");
            const data = await res.json();
            newsList = data.stories || [];
            renderNewsShelf(newsList);
            newsLoaded = true;
        } catch (e) {
            console.error(e);
            newsShelf.innerHTML = `<div class="reader-placeholder" style="padding: 20px;"><p>Error loading current stories. Check API connection.</p></div>`;
        }
    }

    function renderNewsShelf(stories) {
        newsShelf.innerHTML = "";
        if (stories.length === 0) {
            newsShelf.innerHTML = `<div class="reader-placeholder" style="padding: 20px;"><p>No current stories found.</p></div>`;
            return;
        }

        stories.forEach((story, index) => {
            const card = document.createElement("div");
            card.className = "news-card-compact";
            card.setAttribute("data-index", index);
            
            const badge = document.createElement("div");
            badge.className = "news-badge";
            badge.textContent = story.category;
            card.appendChild(badge);

            const title = document.createElement("h4");
            title.textContent = story.title;
            card.appendChild(title);

            const quote = document.createElement("blockquote");
            quote.className = "shakespeare-quote";
            quote.style.fontSize = "11.5px";
            quote.style.margin = "0";
            quote.innerHTML = `"${story.quote}" <cite style="font-size:9px; margin-top:2px;">— ${story.citation}</cite>`;
            card.appendChild(quote);

            card.addEventListener("click", () => {
                document.querySelectorAll(".news-card-compact").forEach(el => el.classList.remove("active"));
                card.classList.add("active");
                selectNewsStory(story);
            });

            newsShelf.appendChild(card);
        });
    }

    async function selectNewsStory(story) {
        activeNewsStory = story;
        
        // Context card embed HTML
        const storyHtml = `
            <div class="news-story-embed">
                <div class="news-badge" style="margin-bottom: 8px;">${story.category}</div>
                <h4>${story.title}</h4>
                <p class="excerpt">${story.excerpt}</p>
                <hr class="divider" style="margin: 8px 0;">
                <blockquote class="shakespeare-quote" style="font-size: 13px;">
                    "${story.quote}"
                    <cite>— ${story.citation}</cite>
                </blockquote>
            </div>
        `;
        
        newsChatHistory = [];
        newsChatMessages.innerHTML = "";
        
        appendNewsChatBubble("user", `Selected Story: "${story.title}"\n\n${story.excerpt}`);
        newsChatHistory.push({
            role: "user",
            content: `Analyze this news story: Headline: "${story.title}". Excerpt: "${story.excerpt}". Quote: "${story.quote}" (${story.citation}).`
        });

        const typingId = appendNewsChatBubble("assistant", `
            <div class="loader-container" style="flex-direction:row; padding:0; height:auto; gap:6px;">
                <div class="loader" style="width:14px; height:14px; border-width:2px;"></div>
                <span style="font-size:12px; color:var(--text-muted);">Analyzing story through Shakespearean lens...</span>
            </div>
        `);
        newsChatMessages.scrollTop = newsChatMessages.scrollHeight;

        try {
            const res = await fetch(`${API_BASE}/api/news/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: story.title, excerpt: story.excerpt })
            });
            
            const typingBubble = document.getElementById(typingId);
            if (typingBubble) typingBubble.remove();

            if (!res.ok) throw new Error("Failed to analyze news story.");
            const data = await res.json();

            const responseHtml = `
                <div style="margin-bottom: 12px; border-left: 2px solid var(--accent-primary); padding-left: 10px; font-style: italic; color: var(--text-secondary); font-size: 13.5px;">
                    <strong>Story:</strong> ${story.title}
                </div>
                ${renderMarkdown(data.analysis)}
            `;
            const assistantMsgId = appendNewsChatBubble("assistant", responseHtml);
            newsChatHistory.push({ role: "assistant", content: data.analysis });
            
            const assistantMsgEl = document.getElementById(assistantMsgId);
            if (assistantMsgEl) {
                newsChatMessages.scrollTo({
                    top: assistantMsgEl.offsetTop - 12,
                    behavior: "smooth"
                });
            }
        } catch (e) {
            console.error(e);
            const typingBubble = document.getElementById(typingId);
            if (typingBubble) typingBubble.remove();
            appendNewsChatBubble("system", `⚠️ Error: Could not generate Shakespearean analysis. Check server connection.`);
        }
    }

    function appendNewsChatBubble(role, content) {
        const id = `news-msg-${Date.now()}`;
        const div = document.createElement("div");
        div.className = `message ${role}-message`;
        div.id = id;

        const avatar = document.createElement("div");
        avatar.className = "msg-avatar";
        avatar.textContent = role === "user" ? "🎓" : "🧙‍♂️";
        div.appendChild(avatar);

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        if (role === "user" || role === "system") {
            bubble.textContent = content;
        } else {
            bubble.innerHTML = content;
        }
        div.appendChild(bubble);

        newsChatMessages.appendChild(div);
        return id;
    }

    refreshNewsBtn.addEventListener("click", () => {
        loadTopNews(true);
    });

    newsChatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const inputVal = newsChatInput.value.trim();
        if (!inputVal) return;

        newsChatInput.value = "";

        const isQuestion = inputVal.includes("?") || inputVal.toLowerCase().split(" ").some(w => ["how","why","what","who","tell","explain","is","are","can"].includes(w));
        
        if (activeNewsStory && isQuestion) {
            logSessionEvent("chat", { query: inputVal, metadata: { context: "news_story", storyTitle: activeNewsStory.title } });
            appendNewsChatBubble("user", inputVal);
            newsChatHistory.push({ role: "user", content: inputVal });
            newsChatMessages.scrollTop = newsChatMessages.scrollHeight;
            
            const typingId = appendNewsChatBubble("assistant", `
                <div class="loader-container" style="flex-direction:row; padding:0; height:auto; gap:6px;">
                    <div class="loader" style="width:14px; height:14px; border-width:2px;"></div>
                    <span style="font-size:12px; color:var(--text-muted);">Contemplating...</span>
                </div>
            `);

            try {
                const res = await fetch(`${API_BASE}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: inputVal, history: newsChatHistory })
                });

                const typingBubble = document.getElementById(typingId);
                if (typingBubble) typingBubble.remove();

                if (!res.ok) throw new Error("Failed to get chat response.");
                const data = await res.json();

                const assistantMsgId = appendNewsChatBubble("assistant", renderMarkdown(data.reply));
                newsChatHistory.push({ role: "assistant", content: data.reply });
                
                const assistantMsgEl = document.getElementById(assistantMsgId);
                if (assistantMsgEl) {
                    newsChatMessages.scrollTo({
                        top: assistantMsgEl.offsetTop - 12,
                        behavior: "smooth"
                    });
                }
            } catch (err) {
                console.error(err);
                const typingBubble = document.getElementById(typingId);
                if (typingBubble) typingBubble.remove();
                appendNewsChatBubble("system", `⚠️ Error: Chat server error.`);
            }
        } else {
            logSessionEvent("search_news", { query: inputVal, metadata: { type: "news" } });
            activeNewsStory = null;
            document.querySelectorAll(".news-card-compact").forEach(el => el.classList.remove("active"));
            
            newsChatHistory = [];
            newsChatMessages.innerHTML = "";
            
            appendNewsChatBubble("user", `Searching for news: "${inputVal}"`);
            
            const typingId = appendNewsChatBubble("assistant", `
                <div class="loader-container" style="flex-direction:row; padding:0; height:auto; gap:6px;">
                    <div class="loader" style="width:14px; height:14px; border-width:2px;"></div>
                    <span style="font-size:12px; color:var(--text-muted);">Searching the web for "${inputVal}" and analyzing...</span>
                </div>
            `);
            newsChatMessages.scrollTop = newsChatMessages.scrollHeight;

            try {
                const res = await fetch(`${API_BASE}/api/news/search?query=${encodeURIComponent(inputVal)}`);
                const typingBubble = document.getElementById(typingId);
                if (typingBubble) typingBubble.remove();

                if (!res.ok) throw new Error("News search failed.");
                const data = await res.json();
                
                const story = data.story;
                activeNewsStory = story;
                
                const storyHtml = `
                    <div class="news-story-embed">
                        <div class="news-badge" style="margin-bottom: 8px;">${story.category}</div>
                        <h4>${story.title}</h4>
                        <p class="excerpt">${story.excerpt}</p>
                        <hr class="divider" style="margin: 8px 0;">
                        <blockquote class="shakespeare-quote" style="font-size: 13px;">
                            "${story.quote}"
                            <cite>— ${story.citation}</cite>
                        </blockquote>
                    </div>
                `;
                appendNewsChatBubble("system", `Found story: "${story.title}"`);
                
                const embedDiv = document.createElement("div");
                embedDiv.innerHTML = storyHtml;
                newsChatMessages.appendChild(embedDiv);
                
                newsChatHistory.push({
                    role: "user",
                    content: `Analyze this news story: Headline: "${story.title}". Excerpt: "${story.excerpt}".`
                });

                const responseHtml = `
                    <div style="margin-bottom: 12px; border-left: 2px solid var(--accent-primary); padding-left: 10px; font-style: italic; color: var(--text-secondary); font-size: 13.5px;">
                        <strong>Story:</strong> ${story.title}
                    </div>
                    ${renderMarkdown(data.analysis)}
                `;
                const assistantMsgId = appendNewsChatBubble("assistant", responseHtml);
                newsChatHistory.push({ role: "assistant", content: data.analysis });
                
                const assistantMsgEl = document.getElementById(assistantMsgId);
                if (assistantMsgEl) {
                    newsChatMessages.scrollTo({
                        top: assistantMsgEl.offsetTop - 12,
                        behavior: "smooth"
                    });
                }
            } catch (err) {
                console.error(err);
                const typingBubble = document.getElementById(typingId);
                if (typingBubble) typingBubble.remove();
                appendNewsChatBubble("system", `⚠️ Error: Could not find or analyze news for "${inputVal}". Try another query.`);
            }
        }
    });

    // --- CURRENT CLIMATE MODULE ---
    let climateLoaded = false;

    async function loadTopClimateNews(force = false) {
        if (climateLoaded && !force) return;
        
        climateShelf.innerHTML = `
            <div class="loader-container" style="flex-direction:row; height:120px; gap:8px;">
                <div class="loader" style="width:20px; height:20px; border-width:2px;"></div>
                <span>Loading top climate stories...</span>
            </div>
        `;
        
        try {
            const url = force ? `${API_BASE}/api/climate/top?force=true` : `${API_BASE}/api/climate/top`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch top climate stories.");
            const data = await res.json();
            climateList = data.stories || [];
            renderClimateShelf(climateList);
            climateLoaded = true;
        } catch (e) {
            console.error(e);
            climateShelf.innerHTML = `<div class="reader-placeholder" style="padding: 20px;"><p>Error loading climate stories. Check API connection.</p></div>`;
        }
    }

    function renderClimateShelf(stories) {
        climateShelf.innerHTML = "";
        if (stories.length === 0) {
            climateShelf.innerHTML = `<div class="reader-placeholder" style="padding: 20px;"><p>No climate stories found.</p></div>`;
            return;
        }

        stories.forEach((story, index) => {
            const card = document.createElement("div");
            card.className = "news-card-compact";
            card.setAttribute("data-index", index);
            
            const badge = document.createElement("div");
            badge.className = "news-badge";
            badge.textContent = story.category;
            card.appendChild(badge);

            const title = document.createElement("h4");
            title.textContent = story.title;
            card.appendChild(title);

            const quote = document.createElement("blockquote");
            quote.className = "shakespeare-quote";
            quote.style.fontSize = "11.5px";
            quote.style.margin = "0";
            quote.innerHTML = `"${story.quote}" <cite style="font-size:9px; margin-top:2px;">— ${story.citation}</cite>`;
            card.appendChild(quote);

            card.addEventListener("click", () => {
                document.querySelectorAll("#climate-shelf .news-card-compact").forEach(el => el.classList.remove("active"));
                card.classList.add("active");
                selectClimateStory(story);
            });

            climateShelf.appendChild(card);
        });
    }

    async function selectClimateStory(story) {
        activeClimateStory = story;
        
        // Context card embed HTML
        const storyHtml = `
            <div class="news-story-embed">
                <div class="news-badge" style="margin-bottom: 8px;">${story.category}</div>
                <h4>${story.title}</h4>
                <p class="excerpt">${story.excerpt}</p>
                <hr class="divider" style="margin: 8px 0;">
                <blockquote class="shakespeare-quote" style="font-size: 13px;">
                    "${story.quote}"
                    <cite>— ${story.citation}</cite>
                </blockquote>
            </div>
        `;
        
        climateChatHistory = [];
        climateChatMessages.innerHTML = "";
        
        appendClimateChatBubble("user", `Selected Story: "${story.title}"\n\n${story.excerpt}`);
        climateChatHistory.push({
            role: "user",
            content: `Analyze this climate story: Headline: "${story.title}". Excerpt: "${story.excerpt}". Quote: "${story.quote}" (${story.citation}).`
        });

        const typingId = appendClimateChatBubble("assistant", `
            <div class="loader-container" style="flex-direction:row; padding:0; height:auto; gap:6px;">
                <div class="loader" style="width:14px; height:14px; border-width:2px;"></div>
                <span style="font-size:12px; color:var(--text-muted);">Analyzing story through environmental Shakespearean lens...</span>
            </div>
        `);
        climateChatMessages.scrollTop = climateChatMessages.scrollHeight;

        try {
            const res = await fetch(`${API_BASE}/api/news/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: story.title, excerpt: story.excerpt })
            });
            
            const typingBubble = document.getElementById(typingId);
            if (typingBubble) typingBubble.remove();

            if (!res.ok) throw new Error("Failed to analyze climate story.");
            const data = await res.json();

            const responseHtml = `
                <div style="margin-bottom: 12px; border-left: 2px solid var(--accent-primary); padding-left: 10px; font-style: italic; color: var(--text-secondary); font-size: 13.5px;">
                    <strong>Story:</strong> ${story.title}
                </div>
                ${renderMarkdown(data.analysis)}
            `;
            const assistantMsgId = appendClimateChatBubble("assistant", responseHtml);
            climateChatHistory.push({ role: "assistant", content: data.analysis });
            
            const assistantMsgEl = document.getElementById(assistantMsgId);
            if (assistantMsgEl) {
                climateChatMessages.scrollTo({
                    top: assistantMsgEl.offsetTop - 12,
                    behavior: "smooth"
                });
            }
        } catch (e) {
            console.error(e);
            const typingBubble = document.getElementById(typingId);
            if (typingBubble) typingBubble.remove();
            appendClimateChatBubble("system", `⚠️ Error: Could not generate Shakespearean analysis. Check server connection.`);
        }
    }

    function appendClimateChatBubble(role, content) {
        const id = `climate-msg-${Date.now()}`;
        const div = document.createElement("div");
        div.className = `message ${role}-message`;
        div.id = id;

        const avatar = document.createElement("div");
        avatar.className = "msg-avatar";
        avatar.textContent = role === "user" ? "🎓" : "🧙‍♂️";
        div.appendChild(avatar);

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        if (role === "user" || role === "system") {
            bubble.textContent = content;
        } else {
            bubble.innerHTML = content;
        }
        div.appendChild(bubble);

        climateChatMessages.appendChild(div);
        return id;
    }

    refreshClimateBtn.addEventListener("click", () => {
        loadTopClimateNews(true);
    });

    climateChatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const inputVal = climateChatInput.value.trim();
        if (!inputVal) return;

        climateChatInput.value = "";

        const isQuestion = inputVal.includes("?") || inputVal.toLowerCase().split(" ").some(w => ["how","why","what","who","tell","explain","is","are","can"].includes(w));
        
        if (activeClimateStory && isQuestion) {
            logSessionEvent("chat", { query: inputVal, metadata: { context: "climate_story", storyTitle: activeClimateStory.title } });
            appendClimateChatBubble("user", inputVal);
            climateChatHistory.push({ role: "user", content: inputVal });
            climateChatMessages.scrollTop = climateChatMessages.scrollHeight;

            const typingId = appendClimateChatBubble("assistant", `
                <div class="loader-container" style="flex-direction:row; padding:0; height:auto; gap:6px;">
                    <div class="loader" style="width:14px; height:14px; border-width:2px;"></div>
                    <span style="font-size:12px; color:var(--text-muted);">Contemplating...</span>
                </div>
            `);

            try {
                const res = await fetch(`${API_BASE}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: inputVal, history: climateChatHistory })
                });

                const typingBubble = document.getElementById(typingId);
                if (typingBubble) typingBubble.remove();

                if (!res.ok) throw new Error("Failed to get chat response.");
                const data = await res.json();

                const assistantMsgId = appendClimateChatBubble("assistant", renderMarkdown(data.reply));
                climateChatHistory.push({ role: "assistant", content: data.reply });
                
                const assistantMsgEl = document.getElementById(assistantMsgId);
                if (assistantMsgEl) {
                    climateChatMessages.scrollTo({
                        top: assistantMsgEl.offsetTop - 12,
                        behavior: "smooth"
                    });
                }
            } catch (err) {
                console.error(err);
                const typingBubble = document.getElementById(typingId);
                if (typingBubble) typingBubble.remove();
                appendClimateChatBubble("system", `⚠️ Error: Chat server error.`);
            }
        } else {
            logSessionEvent("search_climate", { query: inputVal, metadata: { type: "climate" } });
            activeClimateStory = null;
            document.querySelectorAll("#climate-shelf .news-card-compact").forEach(el => el.classList.remove("active"));
            
            climateChatHistory = [];
            climateChatMessages.innerHTML = "";
            
            appendClimateChatBubble("user", `Searching for climate news: "${inputVal}"`);
            
            const typingId = appendClimateChatBubble("assistant", `
                <div class="loader-container" style="flex-direction:row; padding:0; height:auto; gap:6px;">
                    <div class="loader" style="width:14px; height:14px; border-width:2px;"></div>
                    <span style="font-size:12px; color:var(--text-muted);">Searching the web for "${inputVal}" and analyzing...</span>
                </div>
            `);
            climateChatMessages.scrollTop = climateChatMessages.scrollHeight;

            try {
                const res = await fetch(`${API_BASE}/api/climate/search?query=${encodeURIComponent(inputVal)}`);
                const typingBubble = document.getElementById(typingId);
                if (typingBubble) typingBubble.remove();

                if (!res.ok) throw new Error("Climate news search failed.");
                const data = await res.json();
                
                const story = data.story;
                activeClimateStory = story;
                
                const storyHtml = `
                    <div class="news-story-embed">
                        <div class="news-badge" style="margin-bottom: 8px;">${story.category}</div>
                        <h4>${story.title}</h4>
                        <p class="excerpt">${story.excerpt}</p>
                        <hr class="divider" style="margin: 8px 0;">
                        <blockquote class="shakespeare-quote" style="font-size: 13px;">
                            "${story.quote}"
                            <cite>— ${story.citation}</cite>
                        </blockquote>
                    </div>
                `;
                appendClimateChatBubble("system", `Found story: "${story.title}"`);
                
                const embedDiv = document.createElement("div");
                embedDiv.innerHTML = storyHtml;
                climateChatMessages.appendChild(embedDiv);
                
                climateChatHistory.push({
                    role: "user",
                    content: `Analyze this climate story: Headline: "${story.title}". Excerpt: "${story.excerpt}".`
                });

                const responseHtml = `
                    <div style="margin-bottom: 12px; border-left: 2px solid var(--accent-primary); padding-left: 10px; font-style: italic; color: var(--text-secondary); font-size: 13.5px;">
                        <strong>Story:</strong> ${story.title}
                    </div>
                    ${renderMarkdown(data.analysis)}
                `;
                const assistantMsgId = appendClimateChatBubble("assistant", responseHtml);
                climateChatHistory.push({ role: "assistant", content: data.analysis });
                
                const assistantMsgEl = document.getElementById(assistantMsgId);
                if (assistantMsgEl) {
                    climateChatMessages.scrollTo({
                        top: assistantMsgEl.offsetTop - 12,
                        behavior: "smooth"
                    });
                }
            } catch (err) {
                console.error(err);
                const typingBubble = document.getElementById(typingId);
                if (typingBubble) typingBubble.remove();
                appendClimateChatBubble("system", `⚠️ Error: Could not find or analyze climate news for "${inputVal}". Try another query.`);
            }
        }
    });

    // --- FLOATING SHAKESPEARE ANIMATION ---
    const floatingHead = document.getElementById("floating-shakespeare");
    if (floatingHead) {
        let posX = Math.random() * (window.innerWidth - 140);
        let posY = Math.random() * (window.innerHeight - 140);
        let velX = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4); // slow speed
        let velY = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);
        let angle = 0;
        let rotSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.05 + Math.random() * 0.05);

        function updateFloatingHead() {
            const width = floatingHead.offsetWidth || 140;
            const height = floatingHead.offsetHeight || 140;

            posX += velX;
            posY += velY;
            angle += rotSpeed;

            // Bounce off boundaries
            if (posX <= 0) {
                posX = 0;
                velX = -velX;
                rotSpeed = -rotSpeed;
            } else if (posX + width >= window.innerWidth) {
                posX = window.innerWidth - width;
                velX = -velX;
                rotSpeed = -rotSpeed;
            }

            if (posY <= 0) {
                posY = 0;
                velY = -velY;
                rotSpeed = -rotSpeed;
            } else if (posY + height >= window.innerHeight) {
                posY = window.innerHeight - height;
                velY = -velY;
                rotSpeed = -rotSpeed;
            }

            // Apply translation and rotation using translate3d for GPU acceleration
            floatingHead.style.left = "0px";
            floatingHead.style.top = "0px";
            floatingHead.style.transform = `translate3d(${posX}px, ${posY}px, 0px) rotate(${angle}deg)`;

            requestAnimationFrame(updateFloatingHead);
        }

        // Start animation loop
        requestAnimationFrame(updateFloatingHead);
    }

    // --- STARTUP LOGIC ---
    checkSystemStatus();
    loadWorks();
});
