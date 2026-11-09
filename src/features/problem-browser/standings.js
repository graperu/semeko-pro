'use strict';
window.ContestStandings=(()=>{
    let dialog,table,note,id,handle,filter,prev,next,page=0,revision=0;
    const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
    async function load(p=0){
        const rev=++revision;page=p;note.textContent='Đang tải bảng xếp hạng…';prev.disabled=next.disabled=true;
        try{
            const result=await electronAPI.ojContestStandings({contestId:id.value,handle:handle.value,onlyHandle:filter.checked,page});
            if(rev!==revision)return;if(!result.ok)throw Error(result.error);
            const d=result.data;table.replaceChildren();
            const head=el('tr');for(const label of ['Hạng','Người thi','Điểm','Phạt',...d.problems.map(p=>p.index)])head.append(el('th',label));table.append(head);
            for(const row of d.rows){
                const tr=el('tr');const names=row.party.members.map(m=>m.handle);
                if(names.some(n=>n.toLowerCase()===handle.value.trim().toLowerCase()))tr.style.background='var(--accent-muted, #34451c)';
                for(const value of [row.rank,names.join(', '),row.points,row.penalty])tr.append(el('td',String(value)));
                for(const [i,p] of row.problemResults.entries()){
                    const td=el('td',p.points>0?String(p.points):p.rejectedAttemptCount?`−${p.rejectedAttemptCount}`:'—');
                    td.style.color=p.points>0?'#85d66b':p.rejectedAttemptCount?'#ff7474':'';
                    td.title=`${d.problems[i]?.name||''} · ${p.type} · Số lần sai: ${p.rejectedAttemptCount||0}`;tr.append(td);
                }table.append(tr);
            }
            note.textContent=`${d.contest.name} · ${d.contest.phase} · ${d.total} người/đội · Trang ${page+1}/${Math.max(1,Math.ceil(d.total/50))} · ${new Date(d.updatedAt).toLocaleTimeString()}${handle.value.trim()&&!d.myRow?' · Không có username này trong bảng chính thức':''}`;
            prev.disabled=page===0;next.disabled=(page+1)*50>=d.total;
        }catch(e){if(rev===revision){table.replaceChildren();note.textContent='Không tải được bảng xếp hạng: '+e.message;}}
    }
    function open(contestId){
        if(!dialog){
            dialog=el('dialog');dialog.id='cf-standings';dialog.style.cssText='width:min(1100px,94vw);max-height:90vh;background:var(--bg-primary,#202020);color:var(--text-primary,#eee);border:1px solid #666;border-radius:16px;padding:20px';
            dialog.append(el('h2','Bảng xếp hạng kỳ thi Codeforces'));
            const controls=el('form');controls.style.cssText='display:flex;gap:10px;flex-wrap:wrap;align-items:center';
            id=el('input');id.type='number';id.min='1';id.placeholder='Contest ID';id.setAttribute('aria-label','Contest ID');
            handle=el('input');handle.placeholder='Username của bạn';handle.setAttribute('aria-label','Username');
            filter=el('input');filter.type='checkbox';const label=el('label','Chỉ username này ');label.append(filter);
            const refresh=el('button','Cập nhật');refresh.type='submit';controls.append(id,handle,label,refresh);controls.onsubmit=e=>{e.preventDefault();load();};dialog.append(controls);
            dialog.append(el('p','Bảng chính thức của kỳ thi. Test trên máy và luyện tập ngoài kỳ thi không thay đổi thứ hạng này. Dữ liệu được lưu đệm tối đa 30 giây.'));
            note=el('p');note.setAttribute('role','status');dialog.append(note);
            const scroll=el('div');scroll.style.cssText='overflow:auto;max-height:55vh';table=el('table');table.style.cssText='border-collapse:separate;border-spacing:12px 8px;width:100%;white-space:nowrap';scroll.append(table);dialog.append(scroll);
            prev=el('button','Trước');next=el('button','Sau');prev.onclick=()=>load(page-1);next.onclick=()=>load(page+1);const close=el('button','Đóng');close.onclick=()=>{revision++;dialog.close();};dialog.append(prev,next,close);document.body.append(dialog);
        }
        id.value=contestId||id.value||'566';if(!dialog.open)dialog.showModal();load();
    }
    return {open};
})();
