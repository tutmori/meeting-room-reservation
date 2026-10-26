console.log("app.jsが読み込まれました");

const SUPABASE_URL =
    "https://jblsoyilshrbdxwkvekh.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_Rvpz5kBm5vj-wpjDeN4ftw_b2vbBsWc";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

const rooms = [
    "A会議室",
    "B会議室",
    "C会議室",
    "D会議室"
];
const START_HOUR = 7;
const END_HOUR = 22;
const SLOT_MINUTES = 30;

const totalMinutes =
    (END_HOUR - START_HOUR) * 60;

const slotCount =
    totalMinutes / SLOT_MINUTES;



let isDragging = false;
let dragStartMinutes = null;
let currentTimeline = null;
let dragCurrentMinutes = null;
let selectionElement = null;

let selectedRoom = null;
let selectedStart = null;
let selectedEnd = null;

let selectedReservationIndex =
    null;

let isEditing = false;
let editingIndex = null;

let editingReservation =
    null;

const detailModal =
    document.getElementById(
        "detailModal"
    );

const detailInfo =
    document.getElementById(
        "detailInfo"
    );

const closeDetailButton =
    document.getElementById(
        "closeDetailButton"
    );

const deleteButton =
    document.getElementById(
        "deleteButton"
    );

const editButton =
    document.getElementById(
        "editButton"
    );

/**ローカルストレージ用意*/
const reservations = [];

console.log("時間枠の数:", slotCount);

console.log("予約可能時間:", START_HOUR, "～", END_HOUR);

console.log("表示する時間:", totalMinutes, "分");

const timeHeader =
    document.getElementById("timeHeader");

for (
    let hour = START_HOUR;
    hour <= END_HOUR;
    hour++
) {

    const label =
        document.createElement("div");

    label.className = "time-label";

    label.textContent =
        `${hour}:00`;

    const minutesFromStart =
    (hour - START_HOUR) * 60;

    const percent =
    (minutesFromStart / totalMinutes) * 100;

    label.style.left =
        `${percent}%`;

    timeHeader.appendChild(label);
}

console.log(rooms);

const roomsElement =
    document.getElementById("rooms");

rooms.forEach(function (roomName) {

    const row =
        document.createElement("div");

    row.className = "room-row";

    const label =
        document.createElement("div");

    label.className = "room-label";

    label.textContent = roomName;

    const timeline =
        document.createElement("div");

    timeline.className = "timeline";

    timeline.dataset.room = roomName;

    timeline.addEventListener("mousedown", function (event) {
        if (
            event.target.closest(".reservation")
        ) {
        return;
        }
        
        console.log(
            "タイムラインmousedown"
        );
        if (event.button !== 0) {
            return;
        }

        const rect =
            timeline.getBoundingClientRect();

        const startX =
            event.clientX - rect.left;

        const rawMinutes =
            xToMinutes(
                startX,
                rect.width
            );

        dragStartMinutes =
            snapToSlot(rawMinutes);
        
        dragCurrentMinutes =
            dragStartMinutes;

        isDragging = true;
        currentTimeline = timeline;

        if (selectionElement) {
            selectionElement.remove();
        }

        selectionElement =
            document.createElement("div");

        selectionElement.className =
            "drag-selection";

        currentTimeline.appendChild(
            selectionElement
        );

        console.log("ドラッグ開始");

        console.log(
            "会議室:",
            timeline.dataset.room
        );

        console.log(
            "開始位置:",
            startX,
            "px"
        );

        console.log(
            "補正前の分数:",
            rawMinutes
        );

        console.log(
            "30分単位に補正:",
            dragStartMinutes
        );

        console.log(
            "開始時刻:",
            minutesToTime(dragStartMinutes)
        );

    });

    row.appendChild(label);
    row.appendChild(timeline);

    roomsElement.appendChild(row);

});

const modal =
    document.getElementById(
        "reservationModal"
    );

const selectedInfo =
    document.getElementById(
        "selectedInfo"
    );

const saveButton =
    document.getElementById(
        "saveButton"
    );

const cancelButton =
    document.getElementById(
        "cancelButton"
    );

const reservedByInput =
    document.getElementById(
        "reservedBy"
    );

const startTimeSelect =
    document.getElementById(
        "startTimeSelect"
    );

const endTimeSelect =
    document.getElementById(
        "endTimeSelect"
    );

const purposeInput =
    document.getElementById(
        "purpose"
    );

const datePicker = document.getElementById("datePicker");

console.log(datePicker);

const today = new Date();

function formatDate(date) {

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

datePicker.value = formatDate(today);

console.log(formatDate(today));

const prevDayButton = document.getElementById("prevDay");
const nextDayButton =
    document.getElementById("nextDay");

prevDayButton.addEventListener(
    "click",
    async function () {

        const currentDate =
            new Date(
                datePicker.value + "T00:00:00"
            );

        currentDate.setDate(
            currentDate.getDate() - 1
        );

        datePicker.value =
            formatDate(currentDate);

        await loadReservationsFromSupabase();

    }
);

nextDayButton.addEventListener(
    "click",
    async function () {

        const currentDate =
            new Date(
                datePicker.value + "T00:00:00"
            );

        currentDate.setDate(
            currentDate.getDate() + 1
        );

        datePicker.value =
            formatDate(currentDate);

        await loadReservationsFromSupabase();

    }
);

todayButton.addEventListener(
    "click",
    async function () {

        datePicker.value =
            formatDate(
                new Date()
            );

        await loadReservationsFromSupabase();

    }
);

datePicker.addEventListener(
    "change",
    async function () {

        await loadReservationsFromSupabase();

    }
);

function xToMinutes(clickX, width) {

    const ratio =
        clickX / width;

    return ratio * totalMinutes;

}

function minutesToTime(minutes) {

    const total =
        START_HOUR * 60 +
        minutes;

    const hour =
        Math.floor(total / 60);

    const minute =
        Math.round(total % 60);

    return (
        String(hour).padStart(2, "0")
        +
        ":"
        +
        String(minute).padStart(2, "0")
    );
}

function snapToSlot(minutes) {

    return Math.round(
        minutes / SLOT_MINUTES
    ) * SLOT_MINUTES;
}

function updateSelection() {

    const start =
        Math.min(
            dragStartMinutes,
            dragCurrentMinutes
        );

    const end =
        Math.max(
            dragStartMinutes,
            dragCurrentMinutes
        );

    const leftPercent =
        (start / totalMinutes) * 100;

    const widthPercent =
        ((end - start) / totalMinutes) * 100;

    selectionElement.style.left =
        `${leftPercent}%`;

    selectionElement.style.width =
        `${widthPercent}%`;
}

document.addEventListener(
    "mousemove",
    function (event) {

        if (
            !isDragging ||
            !currentTimeline ||
            !selectionElement
        ) {
            return;
        }

        const rect =
            currentTimeline
                .getBoundingClientRect();

        let currentX =
            event.clientX - rect.left;

        currentX =
            Math.max(
                0,
                Math.min(currentX, rect.width)
            );

        const rawMinutes =
            xToMinutes(
                currentX,
                rect.width
            );

        dragCurrentMinutes =
            snapToSlot(rawMinutes);

        updateSelection();
    }
);

document.addEventListener(
    "mouseup",
    function () {

        if (!isDragging) {
            return;
        }
        console.log(
        "mouseup発火"
        );
        const roomName =
            currentTimeline.dataset.room;

        const start =
            Math.min(
                dragStartMinutes,
                dragCurrentMinutes
            );

        let end =
            Math.max(
                dragStartMinutes,
                dragCurrentMinutes
            );

        if (start === end) {
            end =
                Math.min(
                    start + SLOT_MINUTES,
                    totalMinutes
                );
        }

        dragStartMinutes = start;
        dragCurrentMinutes = end;

        updateSelection();

        console.log("ドラッグ終了");

        console.log(
            "会議室:",
            roomName
        );

        console.log(
            "開始時刻:",
            minutesToTime(start)
        );

        console.log(
            "終了時刻:",
            minutesToTime(end)
        );

        const hasConflict =
            reservations.some(
                function (reservation) {

                    return (
                        reservation.room === roomName &&
                        start <
                            reservation.end &&
                        end >
                            reservation.start
                    );

                }
            );

        if (hasConflict) {

            alert(
                "この時間帯は既に予約されています"
            );

            if (selectionElement) {

                selectionElement.remove();

                selectionElement = null;

            }

            return;

        }

        console.log("モーダルを開きます");

        openReservationModal(
            roomName,
            start,
            end
        );
        

        isDragging = false;
        currentTimeline = null;
    }
);



function openReservationModal(
    roomName,
    startMinutes,
    endMinutes
) {

    selectedRoom = roomName;
    selectedStart = startMinutes;
    selectedEnd = endMinutes;

    startTimeSelect.value =
        startMinutes;

    endTimeSelect.value =
        endMinutes;

    selectedInfo.textContent =
        `${roomName}
        ${minutesToTime(startMinutes)}
        ～ ${minutesToTime(endMinutes)}`;

    modal.classList.remove(
        "hidden"
    );

}

/**保存ボタンの機能 */
saveButton.addEventListener(
    "click",
    async function () {

        // プルダウンから現在の選択時間を取得
        const start =
            Number(
                startTimeSelect.value
            );

        const end =
            Number(
                endTimeSelect.value
            );


        // 終了時間が開始時間より後か確認
        if (start >= end) {

            alert(
                "終了時間は開始時間より後にしてください"
            );

            return;
        }

        // 新規予約と編集で、対象の会議室を切り替える
        const room =
            isEditing
                ? editingReservation.room
                : selectedRoom;

        // 編集時は自分自身を重複判定から除外する
        const ignoreIndex =
            isEditing
                ? editingIndex
                : null;

        // プルダウンで選択した最新の時間で重複チェック
        const conflict =
            hasConflict(
                room,
                start,
                end,
                ignoreIndex
            );

        if (conflict) {

            alert(
                "この時間帯は既に予約されています"
            );

            // 新規予約の場合は仮選択を解除してトップへ戻る
            if (!isEditing) {

                if (selectionElement) {

                    selectionElement.remove();

                    selectionElement = null;
                }

                modal.classList.add(
                    "hidden"
                );
            }

            // 編集中の場合はモーダルを残し、正しい時間へ直せるようにする
            return;
        }

        const reservedBy =
        reservedByInput.value.trim();

        if (reservedBy.length === 0) {

            alert(
                "予約者名を入力してください"
            );

            return;
        }

        if (reservedBy.length > 10) {

            alert(
                "予約者名は10文字以内で入力してください"
            );

            return;
        }

        // 保存する予約データを作成
        const reservation = {

            room: room,

            start: start,

            end: end,

            reservedBy:
                reservedBy,

            purpose:
                purposeInput.value.trim()

        };


        // 編集なら置換、新規なら追加
        if (isEditing) {

            reservations[
                editingIndex
            ] = reservation;

            const { error } =
                await supabaseClient
                .from("reservations")
                .update({
                    room:
                    reservation.room,

                    start_minutes:
                    reservation.start,

                    end_minutes:
                    reservation.end,

                    reserved_by:
                    reservation.reservedBy,

                    purpose:
                    reservation.purpose
                })
                .eq(
                "id",
                editingReservation.id
                );

            if (error) {

                console.error(
                "Supabase更新エラー",
                error
                );

            }

        

        } else {

            reservations.push(
                reservation
            );

            const { error } =
            await supabaseClient
                .from("reservations")
                .insert([
                    {
                        reservation_date:
                            datePicker.value,

                        room:
                            reservation.room,

                        start_minutes:
                            reservation.start,

                        end_minutes:
                            reservation.end,

                        reserved_by:
                            reservation.reservedBy,

                        purpose:
                            reservation.purpose
                    }
                ]);

        if (error) {

            console.error(
                "Supabase保存エラー",
                error
            );

        }

        }


 

        // localStorageへ保存して再描画
        //saveReservations();

        await loadReservationsFromSupabase();


        // 編集状態を解除
        isEditing = false;

        editingIndex = null;

        editingReservation = null;


        // 予約入力モーダルを閉じる
        modal.classList.add(
            "hidden"
        );


        // ドラッグ時の半透明ブロックを消す
        if (selectionElement) {

            selectionElement.remove();

            selectionElement = null;
        }


        // 入力欄を空にする
        reservedByInput.value = "";

        purposeInput.value = "";

    }
);

function renderReservations() {

    document
        .querySelectorAll(
            ".reservation"
        )
        .forEach(
            element => element.remove()
        );

    reservations.forEach(
        function (reservation, index) {

            const timeline =
                document.querySelector(
                    `.timeline[data-room="${reservation.room}"]`
                );

            if (!timeline) {
                return;
            }

            const reservationElement =
                document.createElement("div");

            reservationElement.className =
                "reservation";
            
            /**予約ブロックに名札（index）付け*/
            reservationElement.dataset.index =
                index;

            reservationElement.addEventListener(
                "mousedown",
                function (event) {

                event.stopPropagation();

                }
            );
            
            reservationElement.addEventListener(
                /**"mousedown",*/
                "click",
                function (event) {

                            console.log(
                            "予約ブロッククリック"
                            );

                    event.stopPropagation();
                    event.preventDefault();

                    openDetailModal(
                        reservation,
                        index
                    );

                }
            );

            const leftPercent =
                (
                    reservation.start
                    /
                    totalMinutes
                ) * 100;

            const widthPercent =
                (
                    (
                        reservation.end
                        -
                        reservation.start
                    )
                    /
                    totalMinutes
                ) * 100;

            reservationElement.style.left =
                `${leftPercent}%`;

            reservationElement.style.width =
                `${widthPercent}%`;

            reservationElement.innerHTML =
                `
                <strong>
                    ${reservation.reservedBy}
                </strong>
                <br>
                ${reservation.purpose}
                `;

            timeline.appendChild(
                reservationElement
            );

        }
    );

}

/**重複チェック*/
function hasConflict(
    room,
    start,
    end,
    ignoreIndex = null
) {

return reservations.some(
    function (
        reservation,
        index
    ) {

        if (
            index ===
            ignoreIndex
        ) {
            return false;
        }

        return (
            reservation.room === room
            &&
            start <
                reservation.end
            &&
            end >
                reservation.start
        );

    }
);

}

/* ローカルストレージ不要のためコメントアウト
function saveReservations() {

    localStorage.setItem(
        "reservations",
        JSON.stringify(
            reservations
        )
    );

}
*/
renderReservations();

function openDetailModal(
    reservation,
    index
) {
    console.log("詳細モーダル開く");
    selectedReservationIndex =
        index;

    detailInfo.innerHTML =
        `
        <p>
        会議室:
        ${reservation.room}
        </p>

        <p>
        時間:
        ${minutesToTime(
            reservation.start
        )}
        ～
        ${minutesToTime(
            reservation.end
        )}
        </p>

        <p>
        予約者:
        ${reservation.reservedBy}
        </p>

        <p>
        用途:
        ${reservation.purpose}
        </p>
        `;
    
        console.log(detailModal);

    detailModal.classList.remove(
        "hidden"
    );

    console.log(
        detailModal.className
    );

}

closeDetailButton.addEventListener(
    "click",
    function () {

        detailModal.classList.add(
            "hidden"
        );

        modal.classList.add(
            "hidden"
        );

    }
);

deleteButton.addEventListener(
    "click",
    async function () {

        if (
            selectedReservationIndex === null
        ) {
            return;
        }

        const reservationToDelete =
            reservations[
                selectedReservationIndex
            ];

        const { error } =
            await supabaseClient
                .from("reservations")
                .delete()
                .eq(
                    "id",
                    reservationToDelete.id
                );

        if (error) {

            console.error(
                "Supabase削除エラー",
                error
            );

            alert(
                "予約を削除できませんでした"
            );

            return;
        }

        await loadReservationsFromSupabase();

        detailModal.classList.add(
            "hidden"
        );

        selectedReservationIndex =
            null;

        if (selectionElement) {

            selectionElement.remove();

            selectionElement = null;
        }

    }
);

/**キャンセルボタンの機能*/
cancelButton.addEventListener(
    "click",
    function () {

        modal.classList.add(
            "hidden"
        );

        if (selectionElement) {

            selectionElement.remove();

            selectionElement = null;

        }

    }
);

/**編集ボタンの機能*/
editButton.addEventListener(
    "click",
    function () {

        const reservation =
            reservations[
                selectedReservationIndex
            ];

        editingReservation =
            reservation;

        reservedByInput.value =
            reservation.reservedBy;

        purposeInput.value =
            reservation.purpose;
        
        /**選択済みの時間を反映*/
        startTimeSelect.value =
            reservation.start;

        endTimeSelect.value =
            reservation.end;

        isEditing = true;

        editingIndex =
            selectedReservationIndex;

        detailModal.classList.add(
            "hidden"
        );

        modal.classList.remove(
            "hidden"
        );

    }
);

for (
    let minutes = 0;
    minutes <= 900;
    minutes += 30
)
 {

    const option1 =
        document.createElement(
            "option"
        );

    option1.value =
        minutes;

    option1.textContent =
        minutesToTime(
            minutes
        );

    startTimeSelect.appendChild(
        option1
    );

    const option2 =
        document.createElement(
            "option"
        );

    option2.value =
        minutes;

    option2.textContent =
        minutesToTime(
            minutes
        );

    endTimeSelect.appendChild(
        option2
    );

}


async function loadReservationsFromSupabase() {



const selectedDate =
    datePicker.value;

console.log(
    "selectedDate",
    selectedDate
);

const {
    data,
    error
} = await supabaseClient
    .from("reservations")
    .select("*")
    .eq(
        "reservation_date",
        selectedDate
    )
    .order(
        "start_minutes",
        {
            ascending: true
        }
    );


    if (error) {

        console.error(
            "Supabase読み込みエラー",
            error
        );

        return;
    }

    console.log(
        "Supabase取得データ",
        data
    );

    const convertedReservations =
        data.map(
            function (item) {

                return {

                    id:
                        item.id,

                    reservationDate:
                        item.reservation_date,

                    room:
                        item.room,

                    start:
                        item.start_minutes,

                    end:
                        item.end_minutes,

                    reservedBy:
                        item.reserved_by,

                    purpose:
                        item.purpose

                };

            }
        );

    reservations.splice(
        0,
        reservations.length,
        ...convertedReservations
    );

    renderReservations();

}   
loadReservationsFromSupabase();