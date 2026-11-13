export function csvCell(value:unknown):string {
 let text=value==null?"":String(value);
 // Spreadsheet formula injection applies even inside quoted CSV fields.
 if(/^[\s]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function escapeHtml(value:unknown):string{return String(value??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
