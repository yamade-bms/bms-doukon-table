var allData = []; // 全データを保持
var globalMark = ""; // 難易度記号を保持
var groupedData = {}; // レベルごとにグループ化したデータ

// --- ソート用の状態管理変数を追加 ---
var currentSortKey = ""; // 現在ソートしているキー (例: 'title', 'chart_level')
var currentSortOrder = 1; // 1: 昇順, -1: 降順

// --- データソート実行関数 ---
function sortGroupedData() {
    if (!currentSortKey) return;

    for (var level in groupedData) {
        groupedData[level].sort(function(a, b) {
            var valA = a[currentSortKey];
            var valB = b[currentSortKey];

            // null/undefined対策
            valA = valA == null ? "" : valA;
            valB = valB == null ? "" : valB;

            // 数値として比較すべき列（☆など）の処理
            if (currentSortKey === "chart_level" || currentSortKey === "level") {
                var numA = parseFloat(valA) || 0;
                var numB = parseFloat(valB) || 0;
                if (numA !== numB) {
                    return (numA - numB) * currentSortOrder;
                }
            } else {
                // 文字列としての比較 (Title, Artist, Comment等)
                var strA = valA.toString().toLowerCase();
                var strB = valB.toString().toLowerCase();
                if (strA < strB) return -1 * currentSortOrder;
                if (strA > strB) return 1 * currentSortOrder;
            }
            return 0; // 値が同じ場合
        });
    }
}

// --- 展開時の行HTML生成関数 (重複コードを排除) ---
function renderLevelRows(level) {
    var items = groupedData[level] || [];
    var rowsHtml = [];

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var subtitle = (item.subtitle != null && item.subtitle !== "") ? " " + item.subtitle : "";
        var subartist = (item.subartist != null && item.subartist !== "") ? " " + item.subartist : "";
        var chartLevel = item.chart_level;
        var chartDifficulty = item.chart_difficulty;

        rowsHtml.push(
            "<tr class='row-difficulty-" + chartDifficulty + "'>" +
            "<td class='text-transparent'>" + chartDifficulty + "</td>" +
            "<td class='text-center'>" + chartLevel + "</td>" +
            "<td><a href='https://bms-ir.org/new/song?songmd5=" + item.md5 + "' target='_blank'>" + item.title + subtitle + "</a></td>" +
            "<td>" + item.artist + subartist + "</td>" +
            `<td class='text-center'>
              ${item.sha256 
                ? `<a href='https://mocha-repository.info/song.php?sha256=${item.sha256}' target='_blank'><i class='bi bi-box-arrow-up-right'></i></a>` 
                : '-'}
            </td>` +
            "<td>" + item.comment + "</td>" +
            "</tr>"
        );
    }
    return rowsHtml.join("");
}

function initTable() {
    function loadTableData(forceReload) {
        var $loadBtn = $("#btnLoadData");
        var $reloadBtn = $("#btnReload");
        
        $loadBtn.prop("disabled", true).text("読み込み中...");
        $reloadBtn.prop("disabled", true).text("通信中...");

        var headerUrl = $("meta[name=bmstable]").attr("content");
        if (forceReload) {
            headerUrl += "?t=" + new Date().getTime();
        }

        $.getJSON(headerUrl, function (header) {
            globalMark = header.symbol;
            var dataUrl = header.data_url;
            if (forceReload) {
                dataUrl += "?t=" + new Date().getTime();
            }

            $.getJSON(dataUrl, function (information) {
                allData = information;
                var keyword = $("#searchInput").val().toLowerCase();
                if (keyword) {
                    var filteredData = allData.filter(function(item) {
                        var title = (item.title || "").toLowerCase();
                        var artist = (item.artist || "").toLowerCase();
                        return title.includes(keyword) || artist.includes(keyword);
                    });
                    renderHeaders(filteredData);
                } else {
                    renderHeaders(allData);
                }

                $("#loadContainer").hide();
                $("#controlsContainer").removeClass("d-none");
                
                $loadBtn.prop("disabled", false).text("難易度表を読み込む");
                $reloadBtn.prop("disabled", false).text("再読み込み");
            }).fail(function() {
                alert("データ(score.json)の取得に失敗しました。");
                $loadBtn.prop("disabled", false).text("難易度表を読み込む");
                $reloadBtn.prop("disabled", false).text("再読み込み");
            });
        }).fail(function() {
            alert("ヘッダ情報の取得に失敗しました。");
            $loadBtn.prop("disabled", false).text("難易度表を読み込む");
            $reloadBtn.prop("disabled", false).text("再読み込み");
        });
    }

    $("#btnLoadData").on("click", function() { loadTableData(false); });
    $("#btnReload").on("click", function() { loadTableData(true); });

    $("#searchInput").on("input", function() {
        var keyword = $(this).val().toLowerCase();
        if (!keyword) {
            renderHeaders(allData);
            return;
        }
        var filteredData = allData.filter(function(item) {
            var title = (item.title || "").toLowerCase();
            var artist = (item.artist || "").toLowerCase();
            return title.includes(keyword) || artist.includes(keyword);
        });
        renderHeaders(filteredData);
    });

    $("#searchInput").on("keydown", function(e) {
        if (e.isComposing) return;
        if (e.key === "Enter") {
            e.preventDefault();
            $("#btnExpandAll").trigger("click");
        }
    });

    $("#btnExpandAll").on("click", function() {
        $("#table_int .level-header:not(.expanded)").each(function() {
            $(this).trigger("click");
        });
    });

    $("#btnCollapseAll").on("click", function() {
        $("#table_int .level-header").removeClass("expanded");
        $("#table_int .level-content").empty();
    });

    // --- テーブルヘッダ(th)のソート用クリックイベント ---
    $("#table_int").on("click", "th[data-sort]", function() {
        var sortKey = $(this).data("sort");

        // ソート方向の更新
        if (currentSortKey === sortKey) {
            currentSortOrder *= -1; // 反転
        } else {
            currentSortKey = sortKey;
            currentSortOrder = 1; // 新しい列なら昇順リセット
        }

        // 検索状態を維持するためのデータ絞り込み
        var keyword = $("#searchInput").val().toLowerCase();
        var dataToRender = allData;
        if (keyword) {
            dataToRender = allData.filter(function(item) {
                var title = (item.title || "").toLowerCase();
                var artist = (item.artist || "").toLowerCase();
                return title.includes(keyword) || artist.includes(keyword);
            });
        }

        // ソート実行前に「現在開いているレベル」を記憶
        var expandedLevels = [];
        $("#table_int .level-header.expanded").each(function() {
            expandedLevels.push($(this).data("level").toString());
        });

        // テーブル再描画（内部でソートも走る）
        renderHeaders(dataToRender);

        // 記憶していたレベルを再展開し、ソート後のデータで中身を描画
        $("#table_int .level-header").each(function() {
            var $this = $(this);
            var level = $this.data("level").toString();
            if (expandedLevels.includes(level)) {
                var $contentBody = $this.closest("tbody").next(".level-content");
                $contentBody.html(renderLevelRows(level));
                $this.addClass("expanded");
            }
        });
    });

    // レベル展開/折りたたみ処理
    $("#table_int").on("click", ".level-header", function() {
        var $this = $(this);
        var level = $this.data("level");
        var $contentBody = $this.closest("tbody").next(".level-content");

        if ($this.hasClass("expanded")) {
            $contentBody.empty();
            $this.removeClass("expanded");
        } else {
            // HTML生成関数を呼び出す
            $contentBody.html(renderLevelRows(level));
            $this.addClass("expanded");
        }
        var count = groupedData[level] ? groupedData[level].length : 0;
        $this.find("b").text(globalMark + level + " (" + count + ")");
    });
}

function renderHeaders(dataToRender) {
    groupedData = {};

    for (var i = 0; i < dataToRender.length; i++) {
        var lv = dataToRender[i].level;
        if (!groupedData[lv]) {
            groupedData[lv] = [];
        }
        groupedData[lv].push(dataToRender[i]);
    }

    // --- データがグループ化された直後にソートを適用 ---
    sortGroupedData();

    var obj = $("#table_int");
    
    // ヘッダの生成ロジック（ソートアイコンと属性の付与）
    function getThHtml(label, width, sortKey, isCenter) {
        var cls = isCenter ? "class='text-center'" : "";
        
        // ソート記号の生成
        var sortIcon = "";
        if (sortKey && sortKey === currentSortKey) {
            var iconChar = currentSortOrder === 1 ? "▲" : "▼";
            var space = label !== "" ? " " : ""; // ラベルが空の場合は無駄な空白を省く
            // サイズは安定性の高い相対指定（em）を使用
            sortIcon = space + "<span style='font-size: 0.6em; vertical-align: middle;'>" + iconChar + "</span>";
        }
        
        // 基本のスタイル定義
        var styleStr = "width: " + width + "; cursor: pointer; user-select: none;";

        // "chart_difficulty" 列の場合のみ、2chにねじ込むための特別処理
        if (sortKey === "chart_difficulty") {
            // 枠線を少し見やすく調整（半透明の白）
            styleStr += " box-shadow: inset -2px 0 0 0 rgba(255, 255, 255, 0.3);"
            // Bootstrap等の余白を強制リセットし、改行を禁止する
            styleStr += " padding: 0; white-space: nowrap; overflow: hidden;";
        }

        var style = "style='" + styleStr + "'";
        var attr = sortKey ? " data-sort='" + sortKey + "'" : "";
        return "<th " + cls + " " + style + attr + ">" + label + sortIcon + "</th>";
    }

    // mochaの列はソート対象外なので data-sort を渡さない
    var theadHtml = "<thead class='table-dark text-center'><tr>" +
        getThHtml("", "2ch", "chart_difficulty", true) +
        getThHtml("☆", "6ch", "chart_level", true) +
        getThHtml("Title", "40%", "title", false) +
        getThHtml("Artist", "40%", "artist", false) +
        "<th class='text-center' style='width: 5%;'>mocha</th>" + 
        getThHtml("Comment", "10%", "comment", false) +
        "</tr></thead>";

    var htmlParts = [theadHtml];

    for (var level in groupedData) {
        var count = groupedData[level].length;
        htmlParts.push(
            "<tbody>" +
            "<tr class='table-dark level-header' data-level='" + level + "' style='cursor:pointer; text-align:center;'>" +
            "<td colspan='7'><b>" + globalMark + level + " (" + count + ")</b></td>" +
            "</tr>" +
            "</tbody>" +
            "<tbody class='level-content' data-level='" + level + "'></tbody>"
        );
    }

    obj.html(htmlParts.join(""));
}

initTable();
