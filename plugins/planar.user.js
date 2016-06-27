// ==UserScript==
// @id             iitc-plugin-planar@fangelion
// @name           IITC plugin: show list of links
// @category       Info
// @version        0.2.5.@@DATETIMEVERSION@@
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      @@UPDATEURL@@
// @downloadURL    @@DOWNLOADURL@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Display a sortable list of all visible portals with full details about the team, resonators, links, etc.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @include        https://www.ingress.com/mission/*
// @include        http://www.ingress.com/mission/*
// @match          https://www.ingress.com/mission/*
// @match          http://www.ingress.com/mission/*
// @grant          none
// ==/UserScript==
//"use strict";
//jshint ignore:start
@@PLUGINSTART@@ 
// jshint ignore:end

// PLUGIN START ////////////////////////////////////////////////////////
// use own namespace for plugin
window.plugin.planar = function() {};
window.plugin.planar.tmpBkmrk = {};
window.plugin.planar.portalsL = {};
window.plugin.planar.parts = [];
window.plugin.planar.dlistLinks = {};
/*Содержит список порталов и инфы по ним. Идентификаторами будут выступать guid порталов
{"guid1":{title:"",lat:"",lng:"",links:"",part:"",link:"http://"},"guid2":{title:"",lat:"",lng:"",links:"",part:""}}*/
window.plugin.planar.listL = []; //основной список линков, с которым будем работать
/*[{start:"guid",end:"guid",num:"num"},{start:"guid",end:"guid",num:"num"}]*/

/*globals window, console, $, android, addHook, dialog, document, localStorage*/
/*exported setup, android, addHook*/
  /*
    нам необходимо: видеть портал источник, портал назначение, расстояние между ними (если больше определенного значения, то можно впилить калькулятор хватит или не хватит), количество ключей на портал (возможно список порталов с подсчетом ключей), посмотреть у жени эксель, кнопку для смены направления линка, номер линка (редактируемый?), кнопка проверки наличия кросов на линке, общая кнопка (проверка кросов более доскональная - посмотреть апи, плагины)

    информация по порталу - собирать всю постоянную информацию: название, координаты, guid, линк?
  */

/*
  TODO:
*Реализовать запись адреса портала (см модуль чата)
*+Изменяем базу хранения линков и порталов (теперь их две)
*Добавить количество ключей
*Вычисление закрытых полей (как-то обозначать связаные линки)
*Статистика полей/линков по экипажам (если порталы сгруппированы)
*+Добавить группировку порталов в списке порталов. #Группировка в букмаркетах, вывод группируется согласно папкам.
*Добавить импорт порталов по списку линков на них
*/

window.plugin.planar.setPortalsL = function(guid, title, lat, lng) {
  window.plugin.planar.portalsL.push = {guid: guid, title: title, lat: lat, lng: lng};
};

window.plugin.planar.countLincs = function(){
  var tstarr = [];
  for (var link in window.plugin.planar.listL) {
    link = window.plugin.planar.listL[link];
    //console.log(link);
    if (tstarr.indexOf(link.start) == -1) {
      window.plugin.planar.portalsL[link.start].links = 0;
      tstarr.push(link.start);
      //console.log('zeroing')
    }
    if (tstarr.indexOf(link.end) == -1) {
      window.plugin.planar.portalsL[link.end].links = 0;
      tstarr.push(link.end);
    }
    window.plugin.planar.portalsL[link.start].links = window.plugin.planar.portalsL[link.start].links + 1;
    window.plugin.planar.portalsL[link.end].links = window.plugin.planar.portalsL[link.end].links + 1;
  }
};

//Добавить провеврку и чистку одинаковых линков.
window.plugin.planar.checkSameFields = function(){
  //проверка и чистка одинаковых полей (а нужно ли это?)
  var numbers = [];
  for (var i in window.plugin.planar.dlistLinks) {
    latlngs = window.plugin.planar.dlistLinks[i].latlngs;
    for (var j in latlngs){
      txtlatlngs.push([latlngs[j].lat,latlngs[j].lng].join(";"));
    }
    for (var ii in window.plugin.planar.dlistLinks) {
      latlngsTst = window.plugin.planar.dlistLinks[i].latlngs;
      for (var jj in latlngs){
        tstlatlngs.push([latlngsTst[j].lat,latlngsTst[j].lng].join(";"));
      }
      if (tstlatlngs.indexOf(txtlatlngs[0]) != -1 && tstlatlngs.indexOf(txtlatlngs[1]) != -1 && tstlatlngs.indexOf(txtlatlngs[2]) != -1 && i != ii) {
        numbers.push(i);
        console.log("Dublicate links", i, ii);
      }
    }
  }
};

window.plugin.planar.checkSameLinks = function(){
  //проверка и чистка одинаковых полей (а нужно ли это?)
  var numbers = [];
  
  for (var i in window.plugin.planar.listL) {
    var start = window.plugin.planar.listL[i].start;
    var end = window.plugin.planar.listL[i].end;
    for (var ii in window.plugin.planar.listL) {
      var tst = [window.plugin.planar.listL[ii].start,window.plugin.planar.listL[ii].end];
      if (tst.indexOf(start) != -1 && tst.indexOf(end) != -1 && i != ii) {
        numbers.push(i);
        console.log("Dublicate links", i, ii);
        //window.plugin.planar.listL.pop(i);
      }
    }

  }
  for (var j in numbers) {
    window.plugin.planar.listL.pop(numbers[j]);
  }
  //reBuildDT();
};

window.plugin.planar.showListPortals = function(){
  var num = 1;
  var res = "Number;Portal Name;URL of portal;Total links on portal;Count outgoing links;Count incomink links\n";
  var line;
  var arr = {};
  var countFields = 0;
  // {guid:[guid,guid,guid]}
  window.plugin.planar.checkSameLinks();
  window.plugin.planar.countLincs();
  for (var part in window.plugin.planar.parts) {
    part = window.plugin.planar.parts[part];
    res = res + ";" + part + "\n";
    for (var guid in window.plugin.planar.portalsL){
      if (window.plugin.planar.portalsL[guid].part == part) {
        var cntIn = 0;
        var cntOut = 0;
        for (var lnk in window.plugin.planar.listL){
          lnk = window.plugin.planar.listL[lnk];
          if (lnk.start == guid) {cntOut = cntOut + 1;}
          if (lnk.end == guid) {cntIn = cntIn + 1;}
        }
        line = [num,window.plugin.planar.portalsL[guid].title,window.plugin.planar.createPortalLink(guid),window.plugin.planar.portalsL[guid].links,cntOut,cntIn].join(";");
        res = res + line + "\n";
        num = num + 1;
      }
    }
  }
  res = res + "Number;Start portal;End portal;Field portal;Length link;L6;L7;L8\n";
  for (var link in window.plugin.planar.listL){
    num = parseInt(link) + 1;
    field = "";
    link = window.plugin.planar.listL[link];
    if (Object.keys(arr).indexOf(link.start) == -1) {
      arr[link.start] = [];
    }
    if (Object.keys(arr).indexOf(link.end) == -1) {
      arr[link.end] = [];
    }
    if (arr[link.start].indexOf(link.end) == -1) {
      arr[link.start].push(link.end);
    }
    if (arr[link.end].indexOf(link.start) == -1) {
      arr[link.end].push(link.start);
    }
    for (var tstportal in arr) {
      if (arr[tstportal].indexOf(link.start) != -1 && arr[tstportal].indexOf(link.end) != -1) {
        if (field !== ""){
          field = field + " | ";
        }
        field = field + window.plugin.planar.portalsL[tstportal].title;
        countFields = countFields + 1;
        //console.log("new field ", countFields);
      }
    }

    line = [num,window.plugin.planar.portalsL[link.start].title,window.plugin.planar.portalsL[link.end].title,field,link.txtDistance,link.l6,link.l7,link.l8].join(";");
    res = res + line + "\n";
  }
  res = res + "Total fields;"+ countFields;

  dialog({
        html: '<textarea cols="60" rows="1000" readonly>'+res+'</textarea>',
        width: 400,
        height: 400,
        dialogClass: 'ui-dialog-planar-portals',
        title: 'List of portals('+Object.keys(window.plugin.planar.portalsL).length+'); fields('+countFields+')'
      });/*dialog({
        html: '<div id="portals"></div>',
        width: 700,
        dialogClass: 'ui-dialog-planar-portals',
        title: 'List of portals('+Object.keys(window.plugin.planar.portalsL).length+')'
      });
  var num = 1;
  window.plugin.planar.countLincs();
  var table, row, cell;
  var container = $('#portals');//.find("#portals");
  table = document.createElement('table');
  table.className = 'lp';
  //window.plugin.planar.eventLoad();
  console.log("Starting draw portals list");
  for (var guid in window.plugin.planar.portalsL){

    row = table.insertRow(-1);
    var trow = $(row);
    trow.addClass("rowPl");
    cell = row.insertCell(-1);
    $(cell)
      .text(num);
    cell = row.insertCell(-1);
    $(cell)
      .append(getPortalLink(guid));
    cell = row.insertCell(-1);
    $(cell)
      .text(window.plugin.planar.portalsL[guid].links);
    num = num + 1;
  }
  container.append(table);*/
};

window.plugin.planar.createPortalLink = function(guid) {
  portal = window.plugin.planar.portalsL[guid];
  //console.log('get portal link:', portal);
  var perma = 'https://www.ingress.com/intel?ll='+portal.lat+','+portal.lng+'&z=15&pll='+portal.lat+','+portal.lng;
  return perma;
};

function getPortalLink (guid) {
  //var coord = portal.getLatLng();
  portal = window.plugin.planar.portalsL[guid];
  //console.log('get portal link:', portal);
  var perma = '/intel?ll='+portal.lat+','+portal.lng+'&z=15&pll='+portal.lat+','+portal.lng;

  // jQuery's event handlers seem to be removed when the nodes are remove from the DOM
  var link = document.createElement("a");

  link.textContent = portal.title;
  link.href = perma;
  link.addEventListener("click", function(ev) {
    renderPortalDetails(portal.guid);
    ev.preventDefault();
    return false;
  }, false);
  link.addEventListener("dblclick", function(ev) {
    zoomToAndShowPortal(portal.guid, [portal.lat, portal.lng]);
    ev.preventDefault();
    return false;
  });
  return link;
}

window.plugin.planar.chLinkDirect = function (num) {
  /*
  Нужно менять еще и в массиве draw tools ---- болта!!! Не будет работать. 
  Нужно либо переконвертировать в линии, либо отрываться от draw tools, либо дописывать новые линки в конец списка.
  Возьмем первый вариант, как уже готовый, но последний более предпочтителен, хотя и более гемороен.
  Первый не катит, из-за отсутствия привязки в структурах дравтулс. Сложно привязываться. Из дравтулс только пополнение.
  */

  var buf;
  buf = window.plugin.planar.listL[num].start;
  window.plugin.planar.listL[num].start = window.plugin.planar.listL[num].end;
  window.plugin.planar.listL[num].end = buf;
};

window.plugin.planar.reReadPortal = function(id,tp){
  tp = (tp === 0) ? "start" : "end";
  var guid = window.plugin.planar.listL[id][tp];
  latlng = [window.plugin.planar.portalsL[guid].lat,window.plugin.planar.portalsL[guid].lng];
  dic = getByLatLng(latlng);
  window.plugin.planar.portalsL[guid] = dic;
  console.log(window.plugin.planar.tmpBkmrk);
}; 

window.plugin.planar.listInsert = function(idxfrom,idxto) {
  if (idxfrom === idxto) {return true;}
  window.plugin.planar.listL.splice(idxto,0,window.plugin.planar.listL[idxfrom]);
  if (idxfrom > idxto) {
    window.plugin.planar.listL.splice(idxfrom + 1,1);
  }
  else {
    window.plugin.planar.listL.splice(idxfrom,1);
    reBuildDT();
  }
  
};

window.plugin.planar.linkDelete = function(idx){
  window.plugin.planar.listL.splice(idx,1);
  reBuildDT();
  window.plugin.planar.displayPL();
};

// Update the localStorage
window.plugin.planar.saveStorage = function(key,data) {
  localStorage[key] = JSON.stringify(data);
};
// Load the localStorage
window.plugin.planar.loadStorage = function(key,data) {
  data = JSON.parse(localStorage[key]);
};

function linksToText() {
  var result = "";
  window.plugin.planar.listL.forEach( function(link, i){
    result += i + ". " + window.plugin.planar.portalsL[link.start].title + " --> " + window.plugin.planar.portalsL[link.end].title + "\n";
  });
  return result;
}

function portalsToText () {
  var result = "";
  var titles = [];
  window.plugin.planar.listL.forEach( function(link, i){

    if (!titles.includes(window.plugin.planar.portalsL[link.start].title)) {
      result += window.plugin.planar.portalsL[link.start].title + "\n";
      titles.append(window.plugin.planar.portalsL[link.start].title);
    }
    if (!titles.includes(window.plugin.planar.portalsL[link.end].title)) {
      result += window.plugin.planar.portalsL[link.end].title + "\n";
      titles.append(window.plugin.planar.portalsL[link.end].title);
    }
  });
  return result;
}

window.plugin.planar.exportInDT = function(){
  var arr = [];
  if (window.plugin.planar.listL.length === 0) {return false;}
  window.plugin.planar.listL.forEach( function(link, i){
    arr.push({
      type:"polyline",
      latLngs:[{lat:window.plugin.planar.portalsL[link.start].lat,lng:window.plugin.planar.portalsL[link.start].lng},{lat:window.plugin.planar.portalsL[link.end].lat,lng:window.plugin.planar.portalsL[link.end].lng}],
      color:"#a24ac3"
    });
  });
  var res = JSON.stringify(arr);
  dialog({
        html: '<textarea cols="60" rows="1000" readonly>'+res+'</textarea>',
        width: 400,
        height: 400,
        dialogClass: 'ui-dialog-planar-portals',
        title: 'Export DT format'
      });
};

function reBuildDT() {
  //функция пересобирает базу ДТ из базы планара
  //Нужна для того, чтобы упростить рисование 
  var arr = [];
  if (window.plugin.planar.listL.length === 0) {return false;}
  window.plugin.planar.listL.forEach( function(link, i){
    arr.push({
      type:"polyline",
      latLngs:[{lat:window.plugin.planar.portalsL[link.start].lat,lng:window.plugin.planar.portalsL[link.start].lng},{lat:window.plugin.planar.portalsL[link.end].lat,lng:window.plugin.planar.portalsL[link.end].lng}],
      color:"#a24ac3"
    });
  });
  try {
    //var data = JSON.parse(resstr);
    window.plugin.drawTools.drawnItems.clearLayers();
    window.plugin.drawTools.import(arr);
    console.log('Planar: reset and imported drawntools items');
    window.plugin.drawTools.optAlert('Import Successful.');
    window.plugin.drawTools.save();
  }
  catch(e){
    console.warn('Planar: failed to import data: '+e);
    window.plugin.drawTools.optAlert('<span style="color: #f88">Import failed</span>');
  }
}

function checkInList (latlng1, latlng2) {
  /*проверяем наличие координат в списке линков
  если присутствует линк, то false
  если отсутствует то true
  */
  function getGuid(latlng){
    for (var i in window.plugin.planar.portalsL) {
      if ((window.plugin.planar.portalsL[i].lat == latlng[0]) && (window.plugin.planar.portalsL[i].lng == latlng[1])) {
        return i;
      }
    }
    return false;
  }
  var guid1 = getGuid(latlng1);
  var guid2 = getGuid(latlng2);
  if (!((guid1) && (guid2))) {
    return true;
  }
  if (window.plugin.planar.listL.length > 0){
    //console.log('ch listL', window.plugin.planar.listL);
    var test = window.plugin.planar.listL.some( function(value, i) {
      //console.log('forEach  ', value, i);
      var start = value.start;
      var end = value.end;
      if (((guid1 == start) || (guid1 == end)) && ((guid2 == start) || (guid2 == end))) {
        //console.log('link exists ', latlngstart, latlngend, " in list", start, end);
        return true;
      }
      else {
        //console.log('link epsand ', latlngstart, latlngend);
        return false;}
    });
    return !test;
  }
  else {
    return true;
  }
}

function formatToE6 (tst,flag){
  if (typeof(tst) != "string") {
    tst = String(tst);
  }
  if (tst.indexOf(".") == "-1") {
    while (tst.length < 9) {
      tst = "0" + tst;
    }
    tst = tst.substring(0,3) + "." + tst.substring(3);
    tst = String(parseFloat(tst));
  }
  else {
    while (tst.length < 9) {
        tst = tst + "0";
      }
      if (tst.length > 9) {
        tst = tst.substr(0,9);
      }
  }
  if (flag == "bkmrk") {
    while (tst[tst.length-1] == "0"){
      tst.pop(tst.length-1);
    }
  }
  return tst;
}

function addPortalToList (dic){
  guid = dic.guid;
  if (!(guid in window.plugin.planar.portalsL)){
    window.plugin.planar.portalsL[guid] = dic;
  }
}

function getByLatLng(latlng) {
  //поиск в букмарках
  var listn = window.plugin.bookmarks.bkmrksObj.portals;
  var dic = {};
  for(var idFolders in listn) {
    for(var idBkmrk in listn[idFolders].bkmrk) {
      var blatlng = listn[idFolders].bkmrk[idBkmrk].latlng.split(",");
      if(latlng[0] === formatToE6(blatlng[0]) && latlng[1] === formatToE6(blatlng[1])) {
        dic.guid = listn[idFolders].bkmrk[idBkmrk].guid;
        dic.title = listn[idFolders].bkmrk[idBkmrk].label;
        dic.lat = latlng[0];
        dic.lng = latlng[1];
        dic.links = 0;
        dic.part = listn[idFolders].label;
        if (window.plugin.planar.parts.indexOf(dic.part) == -1){
          window.plugin.planar.parts.push(dic.part);
        }
        console.log('added from bookmarks', dic.title, dic.lat, dic.lng);
        window.plugin.planar.tmpBkmrk = listn[idFolders].bkmrk[idBkmrk];
        return dic;
      }
    }
  }
  //поиск в списке порталов
  for(var guid in window.portals) {
    var data = window.portals[guid]._latlng;
    //console.log(data,[latE6, lngE6],window.portals[guid].options.data.title);
    if(formatToE6(data.lat) == latlng[0] && formatToE6(data.lng) == latlng[1]) {
      window.plugin.bookmarks.switchStarPortal(guid);
      var portal = window.portals[guid];
      dic.guid = portal.options.guid;
      dic.title = portal.options.data.title;
      dic.lat = formatToE6(portal._latlng.lat);
      dic.lng = formatToE6(portal._latlng.lng);
      dic.links = 0;
      dic.part = "Other";
      if (window.plugin.planar.parts.indexOf(dic.part) == -1){
        window.plugin.planar.parts.push(dic.part);
      }
      console.log('added from portals', dic.title, dic.lat, dic.lng);
      return dic;
    }
  }
  console.log("Empty portal", latlng);
  dic.guid = latlng.join(',');
  dic.title = latlng.join(',');
  dic.lat = latlng[0];
  dic.lng = latlng[1];
  dic.links = 0;
  dic.part = "Empty";
  if (window.plugin.planar.parts.indexOf(dic.part) == -1){
    window.plugin.planar.parts.push(dic.part);
  }
  return dic;
}

function addLink(one, two) {
  //console.log(one,two);
  one[0] = formatToE6(one[0]);
  one[1] = formatToE6(one[1]);
  two[0] = formatToE6(two[0]);
  two[1] = formatToE6(two[1]);
  var test = checkInList(one,two);
  if (test){
    //console.log('new link',test, one, two);
    var count = window.plugin.planar.listL.length;
    window.plugin.planar.listL[count] = {};
    var port1 = getByLatLng(one);
    addPortalToList(port1);
    window.plugin.planar.listL[count].start = port1.guid;
    var port2 = getByLatLng(two);
    addPortalToList(port2);
    window.plugin.planar.listL[count].end = port2.guid;
    window.plugin.planar.listL[count].num = count + 1;
    var distance = L.latLng(one).distanceTo(two);
    var txtDistance = digits(distance > 10000 ? (distance/1000).toFixed(2) + "km" : (Math.round(distance) + "m"));
    window.plugin.planar.listL[count].distance = distance;
    window.plugin.planar.listL[count].txtDistance = txtDistance;
    portalDistances = [2.560,12.96,40.96,100,207.36,384.16,655.36];
    window.plugin.planar.listL[count].l6 = (distance > 207360) ? "softbank" : "";
    window.plugin.planar.listL[count].l7 = (distance > 384160) ? "softbank" : "";
    window.plugin.planar.listL[count].l8 = (distance > 655360) ? "softbank" : "";

  }
}

window.plugin.planar.fillLinks = function() {
      //нужно парсить список линков полученный из слоя draw tools и если это polyline, то находить координаты порталов в списке закладок после чего составлять список линков пользуясь именами порталов по координатам в букмарках
      //var window.plugin.planar.window.plugin.planar.dlistLinks;
      try {
        window.plugin.planar.dlistLinks = JSON.parse(localStorage['plugin-draw-tools-layer']);
        if (window.plugin.planar.dlistLinks === undefined) return;
      }
      catch (e) {
        console.warn('planar: failed to load data from localStorage: '+e);                
      }
      
      var latlngone, latlngtwo, latlngthree;
      console.log("starting parser");
      for (var link in window.plugin.planar.dlistLinks) {
        //console.log(window.plugin.planar.dlistLinks[link]["latLngs"]);
        if (window.plugin.planar.dlistLinks[link].type === "polyline") {
          for (var i=1; i<window.plugin.planar.dlistLinks[link].latLngs.length; i++) {
              latlngone = [window.plugin.planar.dlistLinks[link].latLngs[i-1].lat,window.plugin.planar.dlistLinks[link].latLngs[i-1].lng];
              latlngtwo = [window.plugin.planar.dlistLinks[link].latLngs[i].lat,window.plugin.planar.dlistLinks[link].latLngs[i].lng];
              addLink(latlngone,latlngtwo);
              //console.log('added polyline ',latlngone,latlngtwo);
              }
          }
        else {
            if (window.plugin.planar.dlistLinks[link].type === "polygon") {
              latlngone = [window.plugin.planar.dlistLinks[link].latLngs[0].lat,window.plugin.planar.dlistLinks[link].latLngs[0].lng];
              latlngtwo = [window.plugin.planar.dlistLinks[link].latLngs[1].lat,window.plugin.planar.dlistLinks[link].latLngs[1].lng];
              latlngthree = [window.plugin.planar.dlistLinks[link].latLngs[2].lat,window.plugin.planar.dlistLinks[link].latLngs[2].lng];
              addLink(latlngone,latlngtwo);
              addLink(latlngtwo,latlngthree);
              addLink(latlngone,latlngthree);
              //console.log('added polygon');
              }
            }
          }
      if (window.plugin.planar.listL.length > 0) {return true;}
      else {
        //console.log('nothing added', window.plugin.planar.listL);
        return false;
      }
    };


window.plugin.planar.linksTable = function() {
  //создаем таблицу для вывода списка линков
  var table, row, cell;
  var container = $('<div>');
  table = document.createElement('table');
  table.className = 'lp';
  //window.plugin.planar.eventLoad();
  container.append(table);
  console.log("build table ");
  window.plugin.planar.listL.forEach(function(link, i) {
    if (link.num-1 != i){
      link.num = i+1;
    }
    row = table.insertRow(-1);
    var trow = $(row);
    trow.addClass("rowPl");
    trow.data("idx",i);
    cell = row.insertCell(-1);
    $(cell)
      .text(link.num)
      .addClass("num")
      .data('idx',link.num);
    cell = row.insertCell(-1);
    cell.appendChild(getPortalLink(link.start));
    cell.className = "portalTitle";

    cell = row.insertCell(-1);
    $(cell)
      .text("==>")
      .addClass("revlink")
      .data("idx", link.num);
    cell = row.insertCell(-1);
    cell.appendChild(getPortalLink(link.end));
    cell.className = "portalTitle";
  });
  return container;
};

window.plugin.planar.eventLoad = function() {
  
  var plugin = $("#planar");
  console.log('Start events');
  plugin
    .on("click",".revlink",function(event) {
        console.log('click on link',$(this).data("idx"));
        window.plugin.planar.chLinkDirect($(this).data("idx")-1);
        plugin.empty().append(window.plugin.planar.linksTable());
        //plugin.trigger(".revlink");
    });
    plugin.trigger("click");
  console.log('second event start');
  plugin
    .on('click','.num', function(event) {
      idx = $(this).text() - 1;
      var menus = $("#planar").find(".menu_planar");
        if (plugin.find('.menu_planar').length === 0){
          $(this).append('<ul class="menu_planar"><li><a onclick="window.plugin.planar.reReadPortal('+idx+',0)">Re read start portal</a></li><li><a onclick="window.plugin.planar.reReadPortal('+idx+',1)">Re read end portal</a></li><li><a onclick="window.plugin.planar.linkDelete('+idx+')">Delete Link</a></li></ul>');
          //$(this).append('<ul class="menu_planar"><li idx="' + idx + '""><window.plugin.planar.linkDelete('+idx+')Delete Link</li></ul>');
          if (idx+1 >= window.plugin.planar.listL.length-4){
            $('.menu_planar',this).css("bottom", "1px");
            
          } else {$('.menu_planar',this).css("bottom", "");
              var pos = $(this).offset();
              var elem_left = pos.left;
              var elem_top = pos.top;
              // положение курсора внутри элемента
              var Xinner = e.pageX - elem_left;
              var Yinner = e.pageY - elem_top;
              $('.menu_planar',this).css("position", "absolute");
              $('.menu_planar',this).css("left", Xinner);
              $('.menu_planar',this).css("top", Yinner);
            }
          $('.menu_planar',this).show('normal');
        } else {
          $('.menu_planar',this).hide('normal');
$('.menu_planar').remove();
        }
    });
    plugin.trigger("click");
    console.log('end adding events');
  console.log("start draggable events");
  var rowPl = plugin.find(".rowPl");
  rowPl.draggable({
    helper: "clone",
     axis: "y"
  });
  var rowIndex = 0;
  rowPl.droppable({
    drop: function(event, ui){
      console.log('droped', ui.draggable.context.rowIndex, event.target.rowIndex);
      window.plugin.planar.listInsert (ui.draggable.context.rowIndex, event.target.rowIndex);
      window.plugin.planar.displayPL();
    },
    over: function(ev, ui){ 
      rowIndex = ui.draggable;
      ui.draggable.css({backgroundColor: "#015801"});},
    out: function(ev, ui){ ui.draggable.css({backgroundColor: "#017f01"});}
  });
  return true;
  
};

window.plugin.planar.displayPL = function() {
  //1 функция, которая стартует по нажатию кнопки. От нее и пляшем.
  var list;

  if (window.plugin.planar.fillLinks()) {
    window.plugin.planar.checkSameLinks();
    list = window.plugin.planar.linksTable();
    //console.log(list);

  } else {
    list = $('<table class="noPortals"><tr><td>Nothing to show!</td></tr></table>');
  }

  if(window.useAndroidPanes()) {
    $('<div id="planar" class="mobile">').append(list).appendTo(document.body);
  } else {
    dialog({
      html: $('<div id="planar">').append(list),
      dialogClass: 'ui-dialog-planar',
      title: 'Links list: ' + window.plugin.planar.listL.length + ' ' + (window.plugin.planar.listL.length == 1 ? 'link' : 'links'),
      id: 'planar-list',
      width: 700,
      resizable: true,
      buttons: {
        "reload": function(e){ $("#planar").empty().append(window.plugin.planar.displayPL());},
        "Show portal list": function(e){ window.plugin.planar.showListPortals();},
        "Export DT": function(e){ window.plugin.planar.exportInDT();}
        /*"options": function(e){/*doing anything
          if ($("#planar").find('.menu_planar').length === 0){
            $(this).append('<ul class="menu_planar"><li><a onclick="window.plugin.planar.showListPortals()">Show portal list</a></li><li><a onclick="window.plugin.planar.exportInDT()">Export DT</a></li></ul>');
            $('.menu_planar',this).css("bottom", "1px");
            $('.menu_planar',this).show('normal');
          } else {
            $('.menu_planar',this).hide('normal');
            $('.menu_planar').remove();
          }
    }*/}
  });
  }
  window.plugin.planar.eventLoad();
};

window.plugin.planar.onPaneChanged = function(pane) {
  if(pane == "plugin-planar")
    window.plugin.planar.displayPL();
  else
    $("#planar").remove();
};

var setup =  function() {
  if(window.useAndroidPanes()) {
    android.addPane("plugin-planar", "Links list", "ic_action_paste");
    addHook("paneChanged", window.plugin.planar.onPaneChanged);
  } else {
    $('#toolbox').append('<a onclick="window.plugin.planar.displayPL()" title="Display a list of portals in the current view [t]" accesskey="t">Links list</a>');
  }

  $("<style>")
    .prop("type", "text/css")
    .html("@@INCLUDESTRING:plugins/portals-list.css@@")
    .appendTo("head");

};

// PLUGIN END //////////////////////////////////////////////////////////
// jshint ignore:start
@@PLUGINEND@@
// jshint ignore:end