// Global variable for OpenAI API key
let OPENAI_API_KEY = null;

// Function to check and prompt for API key (modal), returns Promise that resolves when API key is set
function checkApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("OPENAI_API_KEY", (data) => {
      if (data.OPENAI_API_KEY) {
        OPENAI_API_KEY = data.OPENAI_API_KEY;
        resolve();
      } else {
        alert("OpenAI API 키가 설정되지 않았습니다.\n확장 프로그램 옵션 페이지에서 설정하세요.");
        resolve();
      }
    });
  });
}

// (function() {
(function() {
    // Inject DOMPurify and marked scripts at startup
    const purifyScript = document.createElement("script");
    purifyScript.src = "/libs/purify.min.js";
    document.head.appendChild(purifyScript);

    const markedScript = document.createElement("script");
    markedScript.src = "/libs/marked.min.js";
    document.head.appendChild(markedScript);
    // No longer checkApiKey() at startup; only check in AI functions

    // Global popup variable
    let popup = null;
    let selectedStyle = null;
    let selectedLength = null;
    let lsInput = null;
    let model = "gpt-4o";

    function sleep(sec) {       // sleep 함수 정의
        let start = Date.now(), now = start;
        while (now - start < sec * 1000) {
            now = Date.now();
        }
    }
    function createAiButtonsContainer() {
        const container = document.createElement('div');
        container.id = "ai-buttons-container";
        Object.assign(container.style, {
            position: "fixed",
            bottom: "70px", // 위치 조정 (메인 버튼 위)
            right: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            // 초기 상태: 오른쪽으로 숨김
            transform: "translateX(100%)",
            opacity: "0",
            transition: "transform 0.3s ease, opacity 0.3s ease",
            zIndex: "9999"
        });
        
        // AI에 묻기 버튼
        const questionBtn = document.createElement('button');
        questionBtn.innerText = "문제 정답 요청";
        Object.assign(questionBtn.style, {
            border: "none",
            borderRadius: "15px",
            backgroundColor: "#a0c7ffbb",
            color: "#666",
            padding: "10px 15px",
            fontSize: "16px",
        });
        questionBtn.addEventListener('click', showQuestionPopup);
        
        // AI 요약 버튼
        const summaryBtn = document.createElement('button');
        summaryBtn.innerText = "AI 요약";
        Object.assign(summaryBtn.style, {
            border: "none",
            borderRadius: "15px",
            backgroundColor: "#a0c7ffbb",
            color: "#666",
            padding: "10px 15px",
            fontSize: "16px",
        });
        summaryBtn.addEventListener('click', summarizePage);
        
        container.appendChild(questionBtn);
        container.appendChild(summaryBtn);
        
        document.body.appendChild(container);
        return container;
    }

// Function to add the main AI toggle button
    function addAiToggleButton() {
        const mainBtn = document.createElement('button');
        mainBtn.id = "ai-toggle-btn";
        mainBtn.innerText = "✨";
        Object.assign(mainBtn.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            border: "none",
            borderRadius: "50%",
            backgroundColor: "#a0c7ffbb",
            color: "#666",
            width: "40px",
            height: "40px",
            fontSize: "16px",
            zIndex: "9999",
            cursor: "pointer",
            transition: "background-color 0.3s ease"
        });
        document.body.appendChild(mainBtn);
    
    // Create the container for AI buttons but keep it hidden initially.
        const aiContainer = createAiButtonsContainer();
        
        let isOpen = false;
        mainBtn.addEventListener('click', () => {
            if (!isOpen) {
                // Show the container with slide-in animation
                aiContainer.style.transform = "translateX(0)";
                aiContainer.style.opacity = "1";
                mainBtn.innerText = "X";
                isOpen = true;
            } else {
                // Hide the container with slide-out animation
                aiContainer.style.transform = "translateX(100%)";
                aiContainer.style.opacity = "0";
                mainBtn.innerText = "✨";
                isOpen = false;
            }
        });
    }

    // Remove previous calls to addSummaryButton() and addQuestionButton()
    // and add the new AI toggle button instead:
    addAiToggleButton();
        // Call the Groq API to generate content (replace URL and add API key as needed)
    async function generateContent(promptText, style, length) {
        await checkApiKey();
        if (!OPENAI_API_KEY) return;
        const resultDiv = document.getElementById('groq-result');
        resultDiv.style.display = 'block';
        resultDiv.innerText = "생성 중";
        document.getElementById('groq-actions').style.display = 'block';

        // Combine prompt, style, and length into a single message
        const combinedPrompt = `너는 사용자가 원하는 텍스트 초안을 생성해주는 인공지능 프로그램이야. 다음 사용자의 프롬프트를 주제로 하는 글을 작성해. 고품질의 텍스트 초안을 생성해줘. 언어는 사용자의 요청 언어를 따라야 해.\n"${promptText}"\n다음 조건에 맞춰서 쓸 것:\n[스타일: ${style}, 길이: ${length}]\n#규칙\n1. 사용자의 프롬프트를 주제로 하는 글을 작성해.\n2. 사용자의 요청 언어를 따라야 해.\n3. 사용자의 요청 스타일과 길이를 따라야 해.\n4.사용자가 질문을 입력하면 그거에 대한 답변을 제공하는 것이 아니라 해당 질문에 대해 시사해보는 글을 작성해.`;

        fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: combinedPrompt }
                ]
            })
        })
        .then(response => response.json())
        .then(data => {
            resultDiv.innerText = data.choices && data.choices[0] && data.choices[0].message
                ? data.choices[0].message.content
                : "생성된 내용이 없습니다.";
        })
        .catch(err => {
            resultDiv.innerText = "에러 발생: " + err;
        });
    }

    // Insert text at the cursor position in the active input field
    function insertTextAtCursor(text) {
        sleep(0.5);
        if (lsInput) {  // 입력창이 존재할 경우에만 적용
            lsInput.focus();  // 포커스 복구
            const start = lsInput.selectionStart;
            const end = lsInput.selectionEnd;
            const value = lsInput.value;
            lsInput.value = value.slice(0, start) + text + value.slice(end);
            lsInput.selectionStart = lsInput.selectionEnd = start + text.length;
        } else {
            alert("텍스트를 삽입할 수 있는 입력창이 활성화되지 않았습니다.");
        }
    }

    // Function to create a summary popup
    function createSummaryPopup(summary) {
        const summaryPopup = document.createElement('div');
        summaryPopup.id = "summary-popup";
        Object.assign(summaryPopup.style, {
            all: "unset",
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#ffffff",
            borderRadius: "15px",
            filter: "drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.2))",
            zIndex: "9999",
            width: "400px",
            maxHeight: "300px",
            overflowY: "scroll",
            padding: "20px",
            fontFamily: "Arial, sans-serif",
            fontSize: "16px",
            color: "#666"
        });
        summaryPopup.innerHTML = `
            <div style="margin-bottom: 10px;">요약 결과:</div>
            <div>${summary}</div>
            <button id="summary-close-btn" style="border:none; border-radius:15px; background-color:#a0c7ffbb; height:40px; width:100%; padding:8px; color:#666;">닫기</button>
        `;
        document.body.appendChild(summaryPopup);

        document.getElementById('summary-close-btn').addEventListener('click', () => {
            summaryPopup.remove();
        });
    }

    // Function to summarize the page text
    async function summarizePage() {
        await checkApiKey();
        if (!OPENAI_API_KEY) return;
        const pageText = document.querySelector("body").innerText;
        console.log(pageText);
        const combinedPrompt = `다음 텍스트의 지문 영역만 한국어로 간단하게 요약해서 요약한 텍스트만 제공해줘.. Text: ${pageText}`;
        fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: combinedPrompt }
                ]
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("API 응답 데이터:", data);  // 디버깅용 로그
            const summary = data.choices?.[0]?.message?.content || "요약할 수 없습니다.";
            createSummaryPopup(summary);
        })
        .catch(err => {
            alert("에러 발생: " + err);
        });
    }

    // function addQuestionButton() {
    //     const questionButton = document.createElement('button');
    //     questionButton.innerText = "AI에 묻기";
    //     Object.assign(questionButton.style, {
    //         position: "fixed",
    //         bottom: "20px", // Positioned above the AI 요약 button
    //         right: "20px",
    //         border: "none",
    //         borderRadius: "15px",
    //         backgroundColor: "#a0c7ffbb",
    //         color: "#666",
    //         padding: "10px 15px",
    //         fontSize: "16px",
    //         zIndex: "9999"
    //     });
    //     questionButton.addEventListener('click', showQuestionPopup);
    //     document.body.appendChild(questionButton);
    // }

    // Add AI Summary button
    // function addSummaryButton() {
    //     const summaryButton = document.createElement('button');
    //     summaryButton.innerText = "AI 요약";
    //     Object.assign(summaryButton.style, {
    //         position: "fixed",
    //         bottom: "80px",
    //         right: "20px",
    //         border: "none",
    //         borderRadius: "15px",
    //         backgroundColor: "#a0c7ffbb",
    //         color: "#666",
    //         padding: "10px 15px",
    //         fontSize: "16px",
    //         zIndex: "9999"
    //     });
    //     summaryButton.addEventListener('click', summarizePage);
    //     document.body.appendChild(summaryButton);
    // }

    // Add AI에 묻기 button
    

    // Function to create and show the question popup
    async function showQuestionPopup() {
        await checkApiKey();
        if (!OPENAI_API_KEY) return;
        // If popup already exists, do nothing
        if (document.getElementById('question-popup')) return;

        const qp = document.createElement('div');
        qp.id = "question-popup";
        Object.assign(qp.style, {
            all: "unset",
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "400px",
            background: "#ffffff",
            borderRadius: "15px",
            filter: "drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.2))",
            zIndex: "9999",
            padding: "20px",
            fontFamily: "Arial, sans-serif",
            fontSize: "16px",
            color: "#666"
        });
        qp.innerHTML = `
            <div style="display: flex; justify-content: flex-end;">
                <button id="question-close-btn" style="border:none; border-radius:50%; background-color:#a0c7ffbb; width:30px; height:30px; color:#666;">X</button>
            </div>
            <div id="question-answer" style="margin-top:15px; max-height:150px; overflow-y:auto;"></div>
            <div style="margin-top: 10px; !important;">
                <p style="font-size:10px; color:#666">AI가 제공하는 답변은 정확하지 않을 수 있습니다. 직접 검토하는 것이 좋습니다. 또한 이미지가 포함된 문제에 대한 풀이는 제공하지 않습니다.</p>
            </div>
            <div style="margin-top: 10px; !important;">
                <select name="model" id="model_selection" style="background-color:#ffffff; color:#666; width:197px; height:20px; font-size:16px; border-radius:15px; border:1px solid #ccc; margin-bottom:10px; white-space:nowrap; !important">
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                    <option value="gpt-4">gpt-4</option>
                    <option value="gpt-4o" selected>gpt-4o</option>
                </select>
                <select name="language" id="lang_selection" style="background-color:#ffffff; color:#666; width:197px; height:20px; font-size:16px; border-radius:15px; border:1px solid #ccc; margin-bottom:10px; !important">
                    <option value="Korean">한국어(Korean)</option>
                    <option value="English">English</option>
                    <option value="Español">Español(Spanish)</option>
                    <option value="Chinese">中文(Chinese)</option>
                    <option value="Japanese">日本語(Japanese)</option>
                    <option value="French">Français(French)</option>
                </select>
            </div>
        `;
        document.body.appendChild(qp);
        askQuestion();

        document.getElementById('question-close-btn').addEventListener('click', () => {
            qp.remove();
        });

        function askQuestion() {
            const questionInput = document.getElementById('question-input');
            const language = document.getElementById('lang_selection').value;

            // Determine page text: use selected text if available, else full page text
            const selectedText = window.getSelection().toString().trim();
            const pageText = selectedText || document.querySelector("body").innerText;

            const combinedPrompt = `너는 수학 또는 국어, 영어 등 다양한 논리문제를 푸는 AI 튜터야.
            다음 지문과 문제를 읽고 다음 순서에 따라 해결해.

            1. 문제를 정확히 이해하고 지문에서 관련 정보를 찾는다.
            2. 문제 해결에 필요한 개념이나 공식, 논리를 설명한다.
            3. 단계별로 풀이 과정을 작성한다.
            4. 최종 정답을 '**정답: [답]**' 형식으로 따로 강조해 보여준다.

            문제:
            [문제 내용]

            지문:
            [지문 내용]

            출력은 마크다운 형식으로 제공해.
            Page Text: "${pageText}"
            Output language: "${language}"`;

            // Show loading indicator in answer area
            const answerDiv = document.getElementById('question-answer');
            answerDiv.innerText = "답변 생성 요청 중...";

            // Streaming fetch implementation
            (async () => {
                try {
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${OPENAI_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: "gpt-4o",
                            stream: true,
                            messages: [
                                { role: "system", content: combinedPrompt }
                            ]
                        })
                    });

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder("utf-8");
                    let result = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split("\n").filter(line => line.trim() !== "");
                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const data = line.replace("data: ", "");
                                if (data === "[DONE]") break;
                                try {
                                    const json = JSON.parse(data);
                                    const content = json.choices?.[0]?.delta?.content;
                                    if (content) {
                                        result += content;
                                        if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
                                            answerDiv.innerHTML = DOMPurify.sanitize(marked.parse(result));
                                            answerDiv.scrollTop = answerDiv.scrollHeight;
                                        } else if (typeof marked !== "undefined") {
                                            answerDiv.innerHTML = marked.parse(result);
                                            answerDiv.scrollTop = answerDiv.scrollHeight;
                                        }
                                    }
                                } catch (e) {
                                    // ignore parse errors for incomplete lines
                                }
                            }
                        }
                    }

                    // Render markdown after completion
                    const renderMarkdown = () => {
                        if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
                            answerDiv.innerHTML = DOMPurify.sanitize(marked.parse(result));
                        } else if (typeof marked !== "undefined") {
                            answerDiv.innerHTML = marked.parse(result);
                        }
                    };

                    if (typeof marked === "undefined") {
                        answerDiv.innerText = "마크다운 파서가 없습니다. marked.min.js를 로컬에 포함했는지 확인하세요.";
                    } else {
                        renderMarkdown();
                    }
                } catch (err) {
                    answerDiv.innerText = "에러 발생: " + err;
                }
            })();
        };
    }

    // addSummaryButton();
    // addQuestionButton();


    function changeModel(){
        var slctmdl = document.getElementById("model_selection");
        model = slctmdl.options[slctmdl.selectedIndex].value;
    };

    // Listen for keystrokes on the document to detect when "//" is typed
    document.addEventListener('keyup', (e) => {
        const target = e.target;
        if (target && (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && target.type === "text") || target.isContentEditable)) {
            const value = target.value || target.innerText;
            if(value && value.slice(-2) === "//"){
                if(!popup){
                    createPopup();
                }
            }
        }
    });
    document.addEventListener('focusin', (e) => {
    // 팝업 내부 요소면 무시
    if (popup && popup.contains(e.target)) return;

    if (e.target.tagName === "TEXTAREA" || (e.target.tagName === "INPUT" && e.target.type === "text") || e.target.isContentEditable) {
        lsInput = e.target;  // 정상적인 입력창만 저장
    }
});
})();
