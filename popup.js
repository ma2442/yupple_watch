"use strict";
// 現在開いているタブページのurl取得
// youtube data api v3 で を取得するスクリプト

var main = async () => {
    let debug = true;
    let dlog = function (...args) {
        if (debug) console.log(...args);
    };

    //////////////////////////////////////////////////////////////////
    // 与えられた動画id(urlの watch?v=~~~ の部分)
    // から動画情報を取得する関数
    //////////////////////////////////////////////////////////////////
    const fetchVideoInfo = async (videoId) => {
        const req =
            "https://youtube.googleapis.com/youtube/v3/videos?" +
            "part=snippet,contentDetails,statistics,status" +
            `&id=${videoId}` +
            `&key=${apiKey}`;

        const ytJson = await fetchYtJson(req);
        await chrome.storage.local.set({ ytJson: ytJson });
    };

    //////////////////////////////////////////////////////////////////
    // 与えられたカスタムURL
    // (チャンネルページで@から始まるチャンネルの識別文字列)
    // からチャンネル情報を取得する関数
    //////////////////////////////////////////////////////////////////
    const fetchChannelInfo = async (url) => {
        // チャンネルAからチャンネルBにページ遷移した場合、
        // RSSのchannel_id= がAのもののままで目的のBのチャンネルIDが取得できない。
        // そのため、改めてGETでアクセスしなおしてチャンネルBのチャンネルIDを取得する。
        const channelId = await fetchChannelId(url);

        // youtube data api からチャネル情報取得
        const req =
            "https://youtube.googleapis.com/youtube/v3/channels?" +
            "part=snippet,contentDetails,statistics,brandingSettings" +
            `&id=${channelId}` +
            `&key=${apiKey}`;

        const ytJson = await fetchYtJson(req);
        await chrome.storage.local.set({ ytJson: ytJson });
    };

    //////////////////////////////////////////////////////////////////
    // youtubeチャンネルページにアクセスしてchannel_idをとってくる関数
    //////////////////////////////////////////////////////////////////
    const fetchChannelId = async (url) => {
        const options = {
            method: "GET",
            body: null,
        };

        const id = await fetchYtChannelPage(url.href);
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
        const response = await fetch(req, options);
        const html = await response.text();
        console.log("html :" + html);
        let id = html
            .match(/feeds\/videos.xml\?channel_id=([\w-]+)"/)[1]
            .toString();
        return id;
    };

    //////////////////////////////////////////////////////////////////
    // youtube Data API v3 を用いてjson情報を取得する関数
    //////////////////////////////////////////////////////////////////
    const fetchYtJson = async (req) => {
        console.log(`fetch youtube json from ${req}`);
        const options = {
            method: "GET",
            body: null,
        };
        const response = await fetch(req, options);
        const json = await response.json();
        console.log(`result: \n${JSON.stringify(json, null, "  ")}`);
        return json;
    };

    //////////////////////////////////////////////////////////////////
    // チャンネル情報を表示する関数
    //////////////////////////////////////////////////////////////////
    const dispChannelInfo = async () => {
        const { ytJson } = await chrome.storage.local.get("ytJson");
        console.log("%o", ytJson);

        const { brandingSettings, snippet, id, statistics } = ytJson.items[0];
        const { publishedAt, title, thumbnails, customUrl } = snippet;
        const { viewCount, subscriberCount, videoCount } = statistics;
        const keywords = brandingSettings?.channel?.keywords || "(なし)";
        const keywordsDisp = keywords
            .split_outside_dquotes(" ")
            ?.join("\r\n")
            .replace(/"/g, "");

        const chUrl = new URL(
            "https://www.youtube.com/" + customUrl + "/videos"
        );

        // 自動的にコピーがONならコピーしてログを表示する。
        if (autoCopy) {
            const copyText = [
                chUrl.href,
                title,
                Number(subscriberCount).toLocaleString() + "人",
                Number(viewCount).toLocaleString() + "回",
                Number(videoCount).toLocaleString() + "本",
                new Date(publishedAt).toLocaleString("ja-JP"),
                id,
                keywordsDisp.replace(/\r\n/g, ",  "),
            ].join("\t");

            dlog(copyText);
            await navigator.clipboard.writeText(copyText);

            document.querySelector("#debug_log").style.display = "inline";
            document.querySelector("#debug").textContent = copyText.replace(
                /\t/g,
                "\r\n"
            );
        }

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
    const dispVideoInfo = async () => {
        const { ytJson } = await chrome.storage.local.get("ytJson");
        console.log("%o", ytJson);

        const { snippet, id, statistics, contentDetails } = ytJson.items[0];
        const {
            categoryId,
            title,
            tags,
            thumbnails,
            publishedAt,
            channelTitle,
            channelId,
        } = snippet;
        const { duration } = contentDetails;
        const { viewCount, likeCount, favoriteCount, commentCount } =
            statistics;
        const when = new Date(publishedAt).toLocaleString("ja-JP");
        const videoUrl = new URL("https://www.youtube.com/watch?v=" + id);
        const channelUrl = new URL(
            "https://www.youtube.com/channel/" + channelId + "/videos"
        );
        const durationHour =
            (duration.match(/(\d+)H/)?.[1] ?? 0) +
            (duration.match(/(\d+)D/)?.[1] ?? 0);
        const durationMinute = duration.match(/(\d+)M/)?.[1] ?? 0;
        const durationSec = duration.match(/(\d+)S/)?.[1] ?? 0;
        const durationDisp =
            durationHour +
            ":" +
            ("00" + durationMinute).slice(-2) +
            ":" +
            ("00" + durationSec).slice(-2);

        // 自動的にコピーがONならコピーしてログを表示する。
        if (autoCopy) {
            const copyText = [
                videoUrl.href,
                title,
                Number(viewCount).toLocaleString() + "回",
                when,
                durationDisp,
                channelUrl,
                channelTitle,
                Number(likeCount).toLocaleString() + " likes",
                Number(favoriteCount).toLocaleString() + " favs",
                Number(commentCount).toLocaleString() + "コメ",
                `${categoryId} ${categoryName[categoryId]}`,
                tags?.join(",  ") || "(なし)",
            ].join("\t");

            dlog(copyText);
            await navigator.clipboard.writeText(copyText);
            document.querySelector("#debug_log").style.display = "inline";
            document.querySelector("#debug").textContent = copyText.replace(
                /\t/g,
                "\r\n"
            );
        }

        const tagsDisp = tags?.join("\n") || "(なし)";
        document.querySelector("#video_id").value = id;
        document.querySelector("#video_title").value = title;
        document.querySelector(
            "#category_id"
        ).value = `${categoryId}   ${categoryName[categoryId]}`;
        document.querySelector("#tags").innerText = tagsDisp;
        const thumbnail =
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
    const categoryName = {};
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
    const { apiKey, autoCopy } = await chrome.storage.local.get([
        "apiKey",
        "autoCopy",
    ]);
    dlog("API KEY: ", apiKey);
    dlog("auto copy: ", autoCopy);

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
    const dispInfo = async (id) => {
        const idArr = [
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
