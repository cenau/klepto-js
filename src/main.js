import template from './template.mustache';
import results_template from './results_template.mustache';
import files_template from './files_template.mustache';
import XLSX from 'xlsx';
import {tinysort} from 'tinysort';
import Please from 'pleasejs';

document.addEventListener('DOMContentLoaded', () => {
  startApp();
});

let people = [];



function startApp() {
  document.body.innerHTML = template.render({ header: 'Drag and drop docs on the Tasteful Coral Box of Revalation' });
  let drop_dom_element = document.createElement('div');
  drop_dom_element.style.width='100px';
  drop_dom_element.style.height='100px';
  drop_dom_element.style['background-color']='coral';
  document.getElementById("dropzone").appendChild(drop_dom_element);
  drop_dom_element.addEventListener('drop', handleDrop, false);
  drop_dom_element.addEventListener('dragover', handleDragover, false);



}

function handleDragover(ev){
  // Prevent default select and drag behavior
  ev.preventDefault();

}

/* processing array buffers, only required for readAsArrayBuffer */
function fixdata(data) {
  var o = "", l = 0, w = 10240;
  for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
  o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
  return o;
}

var rABS = true; // true: readAsBinaryString ; false: readAsArrayBuffer
/* set up drag-and-drop event */
function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  var files = e.dataTransfer.files;
  var i,f;
  for (i = 0; i != files.length; ++i) {
    f = files[i];
    var reader = new FileReader();
    var name = f.name;
    reader.onload = function(e) {
      var data = e.target.result;

      var workbook;
      if(rABS) {
        /* if binary string, read with type 'binary' */
        workbook = XLSX.read(data, {type: 'binary'});
      } else {
        /* if array buffer, convert to base64 */
        var arr = fixdata(data);
        workbook = XLSX.read(btoa(arr), {type: 'base64'});
      }
      let sheets = []
      for (let i in workbook.Sheets){
        sheets.push(workbook.Sheets[i])
      }
      const worksheet = XLSX.utils
        .sheet_to_json(
          sheets[0]
        )
      for (let row of worksheet){
       if (!people.map(person => person.Name.toLowerCase()).includes(row.Name.toLowerCase())){
          people.push(row)
          people[people.length -1].inFiles = [name];
          people[people.length -1].linkedTo = [];
      }else {
        let existing = people.find(person => person.Name.toLowerCase() === row.Name.toLowerCase())
        Object.assign(existing,row)
        if (!existing.inFiles.includes(name)){
            existing.inFiles.push(name);
        }
       
      }
      }
      for (let person of people){
       let lowerName = person.Name.toLowerCase()
       for (let p of people){
       let matches = 
         Object.entries(p)
         .map((value)=>{
           let result = {match:false}
           if (value[0] != 'Name'){
           if (typeof(value[1])==="string"){
              
              result.match = value[1].toLowerCase().includes(lowerName)
              result.field = value[0];
              result.text = value[1];
           }
         }
           return result;
         }
       )

         for (let match of matches){
          if (match.match === true && person.Name != p.Name)
           {
           let linkTo = {name:p.Name, match:{field:match.field, text:match.text}}
           let linkFrom = {name:person.Name, match:{field:match.field, text:match.text}}

             let gotAlready = person.linkedTo.map( m => { return (m.name == linkTo.name && match.text == linkTo.match.text && match.field == linkTo.match.field)})
             let gotAlreadyFrom = p.linkedTo.map( m => { return (m.name == linkFrom.name && match.text == linkFrom.match.text && match.field == linkFrom.match.field)})
             if (!gotAlready.includes(true)) person.linkedTo.push(linkTo)
           if (!gotAlreadyFrom.includes(true) )  p.linkedTo.push(linkFrom)
         }
         }
      }
      }
      updateStats();
      updateFiles(name);  
    };
    if(rABS) reader.readAsBinaryString(f);
    else reader.readAsArrayBuffer(f);
  }
}

function updateFiles(name){

     
      let view = {};
      view.name = name;
      const fileDiv = document.createElement('div');
      document.getElementById('files').appendChild(fileDiv)
      fileDiv.innerHTML = files_template.render(view);
      fileDiv.style['background-color'] = Please.make_color()
}

function updateStats(){
  
  document.getElementById('results').innerHTML = "";
  for (let person of people){
    let data = {};
    data.Name = person.Name;
    data.inDocLength = person.inFiles.length;
    data.linkLength = person.linkedTo.length;
    var personOmit= Object.assign({}, person);
    delete personOmit.linkedTo;
    data.fields = Object.entries(personOmit).map((value)=>(value))
    data.matches = person.linkedTo.map(x => { return{'name':x.name,'field':x.match.field,'text':x.match.text}}) 
    const personDiv = document.createElement('div');
    personDiv.dataset.inDocLength = person.inFiles.length;
    personDiv.dataset.linkLength = person.linkedTo.length;
    personDiv.className = "result"
    document.getElementById('results').appendChild(personDiv)
    personDiv.innerHTML = results_template.render(data);
  }
  
    tinysort('.result' , {data:'in-doc-length',order:'desc'})
    tinysort('.result' , {data:'link-length',order:'desc'})
}


