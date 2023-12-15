"use strict";
// 現在開いているタブページのurl取得
// youtube data api v3 で を取得するスクリプト

var main = async () => {
    //////////////////////////////////////////////////////////////////
    // 与えられた動画id(urlの watch?v=~~~ の部分)
    // から動画情報を取得する関数
    //////////////////////////////////////////////////////////////////
    let fetchVideoInfo = async (videoId) => {
        const req =
            "https://youtube.googleapis.com/youtube/v3/videos?" +
            "part=snippet" +
            `&id=${videoId}` +
            `&key=${apiKey}`;

        let ytJson = await fetchYtJson(req);
        await chrome.storage.local.set({ ytJson: ytJson });
    };

    //////////////////////////////////////////////////////////////////
    // 与えられたカスタムURL
    // (チャンネルページで@から始まるチャンネルの識別文字列)
    // からチャンネル情報を取得する関数
    //////////////////////////////////////////////////////////////////
    let fetchChannelInfo = async (url) => {
        // チャンネルAからチャンネルBにページ遷移した場合、
        // RSSのchannel_id= がAのもののままで目的のBのチャンネルIDが取得できない。
        // そのため、改めてGETでアクセスしなおしてチャンネルBのチャンネルIDを取得する。
        let channelId = await fetchChannelId(url);

        // youtube data api からチャネル情報取得
        const req =
            "https://youtube.googleapis.com/youtube/v3/channels?" +
            "part=snippet,contentDetails,statistics,brandingSettings" +
            `&id=${channelId}` +
            `&key=${apiKey}`;

        let ytJson = await fetchYtJson(req);
        await chrome.storage.local.set({ ytJson: ytJson });
    };

    //////////////////////////////////////////////////////////////////
    // youtubeチャンネルページにアクセスしてchannel_idをとってくる関数
    //////////////////////////////////////////////////////////////////
    let fetchChannelId = async (url) => {
        const options = {
            method: "GET",
            body: null,
        };

        let id = await fetchYtChannelPage(url.href);
        console.log("channel id: " + id);
        return id;
    };

    //////////////////////////////////////////////////////////////////
    // youtube channel ページから channel_idを取得して返す関数
    //////////////////////////////////////////////////////////////////
    let fetchYtChannelPage = async (req) => {
        const options = {
            method: "GET",
            body: null,
        };
        let response = await fetch(req, options);
        let html = await response.text();
        console.log("html :" + html);
        let id = html
            .match(/feeds\/videos.xml\?channel_id=([\w-]+)"/)[1]
            .toString();
        return id;
    };

    //////////////////////////////////////////////////////////////////
    // youtube Data API v3 を用いてjson情報を取得する関数
    //////////////////////////////////////////////////////////////////
    let fetchYtJson = async (req) => {
        console.log(`fetch youtube json from ${req}`);
        const options = {
            method: "GET",
            body: null,
        };
        let response = await fetch(req, options);
        let json = await response.json();
        console.log(`result: \n${JSON.stringify(json, null, "  ")}`);
        return json;
    };

    //////////////////////////////////////////////////////////////////
    // チャンネル情報を表示する関数
    //////////////////////////////////////////////////////////////////
    let dispChannelInfo = async () => {
        let { ytJson } = await chrome.storage.local.get("ytJson");
        console.log("%o", ytJson);

        const { brandingSettings, snippet, id } = ytJson.items[0];
        const { title, customUrl, thumbnails } = snippet;

        let keywords = brandingSettings?.channel?.keywords || "(なし)";
        let keywordsDisp = keywords
            .split_outside_dquotes(" ")
            ?.join("\r\n")
            .replace(/"/g, "");
        document.querySelector("#keywords").innerText = keywordsDisp;
        document.querySelector("#channel_id").value = id;
        document.querySelector("#channel_title").value = title;
        document.querySelector("#custom_url").value = customUrl;
        document.querySelector("#channel_thumbnail").src =
            thumbnails?.high?.url ||
            thumbnails?.medium?.url ||
            thumbnails?.default?.url;
    };

    //////////////////////////////////////////////////////////////////
    // 動画情報を表示する関数
    //////////////////////////////////////////////////////////////////
    let dispVideoInfo = async () => {
        let { ytJson } = await chrome.storage.local.get("ytJson");
        console.log("%o", ytJson);

        let { snippet, id } = ytJson.items[0];
        let { categoryId, title, tags, thumbnails } = snippet;
        let tagsDisp = tags?.join("\n") || "(なし)";

        document.querySelector("#video_id").value = id;
        document.querySelector("#video_title").value = title;
        document.querySelector(
            "#category_id"
        ).value = `${categoryId}   ${categoryName[categoryId]}`;
        document.querySelector("#tags").innerText = tagsDisp;
        let thumbnail =
            thumbnails.maxres ||
            thumbnails.standard ||
            thumbnails.high ||
            thumbnails.medium ||
            thumbnails.default;
        document.querySelector("#video_thumbnail").src = thumbnail.url;
    };

    //////////////////////////////////////////////////////////////////
    // 動画カテゴリリスト
    //////////////////////////////////////////////////////////////////
    let categoryName = {};
    categoryName[1] = "映画とアニメ";
    categoryName[2] = "自動車と乗り物";
    categoryName[10] = "音楽";
    categoryName[15] = "ペットと動物";
    categoryName[17] = "スポーツ";
    categoryName[18] = "ショート ムービー";
    categoryName[19] = "旅行とイベント";
    categoryName[20] = "ゲーム";
    categoryName[21] = "動画ブログ";
    categoryName[22] = "ブログ";
    categoryName[23] = "コメディー";
    categoryName[24] = "エンターテイメント";
    categoryName[25] = "ニュースと政治";
    categoryName[26] = "ハウツーとスタイル";
    categoryName[27] = "教育";
    categoryName[28] = "科学と技術";
    categoryName[30] = "映画";
    categoryName[31] = "アニメ";
    categoryName[32] = "アクション/アドベンチャー";
    categoryName[33] = "クラシック";
    categoryName[34] = "コメディー";
    categoryName[35] = "ドキュメンタリー";
    categoryName[36] = "ドラマ";
    categoryName[37] = "家族向け";
    categoryName[38] = "海外";
    categoryName[39] = "ホラー";
    categoryName[40] = "SF/ファンタジー";
    categoryName[41] = "サスペンス";
    categoryName[42] = "短編";
    categoryName[43] = "番組";
    categoryName[44] = "予告編";

    //////////////////////////////////////////////////////////////////
    // イベントハンドラー、イベントリスナー
    //////////////////////////////////////////////////////////////////
    function changeThumbnail(e) {
        switch (e.target.width) {
            case 320:
                e.target.width = 32;
                break;
            case 32:
                e.target.width = 320;
                break;
        }
        e.target.height = (e.target.width * 9) / 16;
    }

    document.addEventListener("DOMContentLoaded", function () {
        document
            .querySelector("#video_thumbnail")
            .addEventListener("click", changeThumbnail);
    });

    //////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////
    // ユーティリティ部
    //////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////
    // 文字列を指定された文字で区切って配列に変換する
    // 但し、ダブルクォーテーション内部では区切らない。
    // （入れ子構造不可, ダブルクォーテーションは区切り文字に指定できない）
    //////////////////////////////////////////////////////////////////
    String.prototype.split_outside_dquotes = function (delim) {
        // console.log(`split_outside_dquotes: ${this}`);

        const chars = this.split("");
        // console.log(chars.join(""));

        let is_plain = true;

        // 区切り文字を明確にする
        const chars_analyzed = chars.map((e) => {
            if (e === '"') is_plain = !is_plain;
            if (e === delim && is_plain) return "__delim__";
            return e;
        });

        // 実際に区切った文字列配列を生成
        const strs_splitted = chars_analyzed.reduce(
            (acc, e) => {
                const m1 = acc.length - 1;
                if (e === "__delim__") acc.push("");
                else acc[m1] = acc[m1] + e;
                return acc;
            },
            [""]
        );

        console.log(strs_splitted);
        return strs_splitted;
    };

    //////////////////////////////////////////////////////////////////
    // 実行部
    //////////////////////////////////////////////////////////////////
    // API KEY 設定値取得
    let { apiKey } = await chrome.storage.local.get("apiKey");
    console.log("API KEY: ", apiKey);

    // アクティブタブのURL取得
    const tabs = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
    });

    const url = new URL(tabs[0].url);

    console.log(`url.href : ${url.href}`);
    console.log(`url.host : ${url.host}`);
    console.log(`url.pathname : ${url.pathname}`);
    console.log(`url.search : ${url.search}`);
    const paths = url.pathname.split("/");

    // ポップアップ表示調整関数
    let dispInfo = async (id) => {
        let idArr = [
            "no_api_key_info",
            "description_info",
            "channel_info",
            "video_info",
            "debug_log",
        ];
        idArr.forEach(
            (e) => (document.querySelector("#" + e).style.display = "none")
        );
        document.querySelector("#" + id).style.display = "inline";
    };
    if (!apiKey || apiKey === "") {
        dispInfo("no_api_key_info");
        return;
    }
    if (url.host !== "www.youtube.com" || paths[1] === "") {
        console.log("nothing to do.");
        dispInfo("description_info");
        return;
    }
    if (paths[1].startsWith("@") || paths[1] === "channel") {
        // チャンネルページなので チャンネル情報取得
        // @カスタムURL（標準的？）と、channel/channel_id の二パターン
        // どちらのページも内容は同じ。
        // https://www.youtube.com/@ANNnewsCH/featured
        // https://www.youtube.com/channel/UCGCZAYq5Xxojl_tSXcVJhiQ
        dispInfo("channel_info");
        await fetchChannelInfo(url);
        await dispChannelInfo();
    } else {
        // urlから動画idを抜き出してみる
        let videoId;
        if (paths[1] === "shorts" && paths[2]) {
            // ショート動画の場合
            videoId = paths[2];
        } else {
            // 通常動画の場合はvパラメータがあるはず
            const params = new URLSearchParams(url.search);
            videoId = params.get("v");
        }
        console.log(`video id: ${videoId}`);
        if (!videoId) {
            // idなければ終了
            console.log("nothing to do.");
            return;
        }
        // 動画ページなので 動画情報取得
        dispInfo("video_info");
        await fetchVideoInfo(videoId);
        await dispVideoInfo();
    }
};

main();
