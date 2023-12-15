"use strict";

let main = async () => {
    let debug = true;
    let dlog = function (...args) {
        if (debug) console.log(...args);
    };

    // getElementByIdを指定回数リトライ Promiseを返す。
    let getElementByIdPromise = async (id, triesMax) => {
        if (triesMax == 0) return null;

        let elem = document.getElementById(id);
        dlog("id", id, "triesMax", triesMax, "%o", elem);
        if (elem) return elem;

        // 少し待ってリトライ
        await new Promise((ok) => setTimeout(ok, 50));
        return getElementByIdPromise(id, triesMax - 1);
    };

    let save = await getElementByIdPromise("save", 10);
    let log = await getElementByIdPromise("log", 10);
    let apiKeyInput = await getElementByIdPromise("api_key", 10);

    let stored = await chrome.storage.local.get();
    apiKeyInput.value = stored.apiKey || "";

    let saveListener = async (event) => {
        event.target.disabled = true;
        await chrome.storage.local.set({ apiKey: apiKeyInput.value });
        let { apiKey } = await chrome.storage.local.get("apiKey");
        log.innerText = `"${apiKey}" をAPI KEYとして保存しました。`;
        event.target.disabled = false;
        return;
    };

    let testListener = async (event) => {
        event.target.disabled = true;
        let { apiKey } = await chrome.storage.local.get("apiKey");
        let href =
            "https://youtube.googleapis.com/youtube/v3/videoCategories?" +
            "part=snippet" +
            `&regionCode=JP` +
            `&key=${apiKey}`;

        let res;
        let opt = {
            method: "GET",
            body: null,
        };

        dlog("fetch ", href);
        try {
            res = await fetch(href, opt);
            log.innerText = `API KEY "${apiKey}" のテストを開始します。\n`;
            log.innerText += `テストURL:\n`;
            log.innerText += `${href} \n`;
        } catch (e) {
            dlog("error: %o", e);
            log.innerText =
                log.innerText + `エラー　詳細はconsoleを参照してください。`;
            event.target.disabled = false;
            return;
        }

        dlog("response status code : ", res.status);
        log.innerText += `ステータスコード: ${res.status} \n`;

        // レスポンスがOK以外だったらエラー
        let result = res.status === 200 ? "OK" : "NG";
        log.innerText += `結果: ${result}\n`;

        event.target.disabled = false;
        return;
    };

    save.addEventListener("click", saveListener);
    test.addEventListener("click", testListener);
};

//////////////////////////////////////////////////////////////////
// 実行部
//////////////////////////////////////////////////////////////////
main();
