// ==UserScript==
// @id             iitc-plugin-planar@teo96
// @name           IITC plugin: show list of links
// @category       Info
// @version        0.2.1.20160507.81828
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      none
// @downloadURL    none
// @description    [fangelion-2016-05-07-081828] Display a sortable list of all visible portals with full details about the team, resonators, links, etc.
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

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'fangelion';
plugin_info.dateTimeVersion = '20160507.81828';
plugin_info.pluginId = 'planar';
//END PLUGIN AUTHORS NOTE

 
// jshint ignore:end

// PLUGIN START ////////////////////////////////////////////////////////
// use own namespace for plugin
window.plugin.planar = function() {};
window.plugin.planar.listL = []; //основной список линков, с которым будем работать

/*globals window, console, $, android, addHook, dialog, document, localStorage*/
/*exported setup, android, addHook*/
  /*
    нам необходимо: видеть портал источник, портал назначение, расстояние между ними (если больше определенного значения, то можно впилить калькулятор хватит или не хватит), количество ключей на портал (возможно список порталов с подсчетом ключей), посмотреть у жени эксель, кнопку для смены направления линка, номер линка (редактируемый?), кнопка проверки наличия кросов на линке, общая кнопка (проверка кросов более доскональная - посмотреть апи, плагины)

    информация по порталу - собирать всю постоянную информацию: название, координаты, guid, линк?
  */

  /*[{start:[],end:[]},{start:[],end:[]},{start:[],end[]}] - не удобный вариант

    [{start:{guid:"",lat:"",lng:"",title:""},end:{guid:"",lat:"",lng:"",title:""}},{start:{guid:"",lat:"",lng:"",title:""},end:{guid:"",lat:"",lng:"",title:""}},{start:{guid:"",lat:"",lng:"",title:""},end{guid:"",lat:"",lng:"",title:""}}]

    в итоге, нужен список для линков, словарь инфы о портале возвращается функцией, словарь порталов формируется непосредственно при создании записи о линке.

  */

function getPortalLink (portal) {
  //var coord = portal.getLatLng();
  var perma = '/intel?ll='+portal.lat+','+portal.lng+'&z=17&pll='+portal.lat+','+portal.lng;

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
}


function checkInList (latlng1, latlng2) {
  /*проверяем наличие координат в списке линков
  если присутствует линк, то false
  если отсутствует то true
  */
  if (window.plugin.planar.listL.length > 0){
    //console.log('ch listL', window.plugin.planar.listL);
    var test = window.plugin.planar.listL.some( function(value, i) {
      //console.log('forEach  ', value, i);
      var start = [value.start.lat,value.start.lng].join(',');
      var end = [value.end.lat,value.end.lng].join(',');
      var latlngstart = latlng1.join(',');
      var latlngend = latlng2.join(',');
      if (((latlngstart == start) || (latlngstart == end)) && ((latlngend == start) || (latlngend == end))) {
        console.log('link exists ', latlngstart, latlngend, " in list", start, end);
        return true;
      }
      else {
        console.log('link epsand ', latlngstart, latlngend);
        return false;}
    });
    return !test;
  }
  else {
  return true;}
}

    function findBylatlngE6 (latlng) {
      for(var guid in window.portals) {
        var data = window.portals[guid]._latlng;
        //console.log(data,[latE6, lngE6],window.portals[guid].options.data.title);
        if(formatlatlngE6(data.lat) == latlng[0] && formatlatlngE6(data.lng) == latlng[1]) {
          window.plugin.bookmarks.switchStarPortal(guid);
          var result = getportalarr(window.portals[guid]);
          console.log(result);
          return result;
        }
      }
      return undefined;
    }

    function formatlatlngE6 (tst){
      if (typeof(tst) != "string") {
        tst = String(tst);
      }
      while (tst.length < 9) {
        tst = tst + "0";
      }
      if (tst.length > 9) {
        tst = tst.substr(0,9);
      }
      return tst;
    }

    function findBylatlng (latlng) {
      //функа поиска портала в списке по latlng
      var listn = window.plugin.bookmarks.bkmrksObj.portals;
      var dic = {};
      for(var idFolders in listn) {
        for(var idBkmrk in listn[idFolders].bkmrk) {
          var portallatlng = listn[idFolders].bkmrk[idBkmrk].latlng;
          if(latlng.join(",") === portallatlng) {
            dic.guid = listn[idFolders].bkmrk[idBkmrk].guid;
            dic.title = listn[idFolders].bkmrk[idBkmrk].label;
            dic.lat = latlng[0];
            dic.lng = latlng[1];
            return dic;
          }
         }
      }
      return undefined;
    }

    function getportalarr(portal) {
      var dic = {};
      //console.log(portal);
      dic.guid = portal.options.guid;
      dic.title = portal.options.data.title;
      dic.lat = formatlatlngE6(portal._latlng.lat);
      dic.lng = formatlatlngE6(portal._latlng.lng);
      return dic;
    }

    function getEmptyDic(latlng) {
      var dic = {};
      dic.guid = "empty";
      dic.title = latlng.join(',');
      dic.lat = latlng[0];
      dic.lng = latlng[1];
      return dic;
    }

    function addLink(one, two) {
      //console.log(one,two);
      one[0] = formatlatlngE6(one[0]);
      one[1] = formatlatlngE6(one[1]);
      two[0] = formatlatlngE6(two[0]);
      two[1] = formatlatlngE6(two[1]);
      var test = checkInList(one,two);
      if (test){
        console.log('new link',test, one, two);
        var count = window.plugin.planar.listL.length;
        window.plugin.planar.listL[count] = {};
        var port1 = findBylatlng(one);
        if (port1 === undefined) {
          port1 = findBylatlngE6(one);
          if (port1 === undefined){
            window.plugin.planar.listL[count].start = getEmptyDic(one);
          }
          else {
            window.plugin.planar.listL[count].start = port1;
          }
        }
        else {
          window.plugin.planar.listL[count].start = port1;
        }
        var port2 = findBylatlng(two);
        if (port2 === undefined) {
          port2 = findBylatlngE6(two);
          if (port2 === undefined){
            window.plugin.planar.listL[count].end = getEmptyDic(two);
          }
          else {
            window.plugin.planar.listL[count].end = port2;
          }
        }
        else {
          window.plugin.planar.listL[count].end = port2;
        }
        window.plugin.planar.listL[count].num = count+1;
      }
    }

window.plugin.planar.fillLinks = function() {
      //нужно парсить список линков полученный из слоя draw tools и если это polyline, то находить координаты порталов в списке закладок после чего составлять список линков пользуясь именами порталов по координатам в букмарках
      var dlistLinks;
      try {
        dlistLinks = JSON.parse(localStorage['plugin-draw-tools-layer']);
        if (dlistLinks === undefined) return;
      }
      catch (e) {
        console.warn('bookmarks: failed to load data from localStorage: '+e);                
      }
      
      var latlngone, latlngtwo, latlngthree;
      console.log("starting parser");
      for (var link in dlistLinks) {
        //console.log(dlistLinks[link]["latLngs"]);
        if (dlistLinks[link].type === "polyline" && dlistLinks[link].latLngs.length <= 2) {
          latlngone = [dlistLinks[link].latLngs[0].lat,dlistLinks[link].latLngs[0].lng];
          latlngtwo = [dlistLinks[link].latLngs[1].lat,dlistLinks[link].latLngs[1].lng];
          addLink(latlngone,latlngtwo);
          //console.log('added line ',latlngone,latlngtwo);
          }
        else {
          if (dlistLinks[link].type === "polyline" && dlistLinks[link].latLngs.length > 2) {
            for (var i=1; i<dlistLinks[link].latLngs.length; i++) {
              latlngone = [dlistLinks[link].latLngs[i-1].lat,dlistLinks[link].latLngs[i-1].lng];
              latlngtwo = [dlistLinks[link].latLngs[i].lat,dlistLinks[link].latLngs[i].lng];
              addLink(latlngone,latlngtwo);
              //console.log('added polyline ',latlngone,latlngtwo);
              }
          //console.log(JSON.stringify(window.portals));
          }
          else {
            if (dlistLinks[link].type === "polygon") {
              latlngone = [dlistLinks[link].latLngs[0].lat,dlistLinks[link].latLngs[0].lng];
              latlngtwo = [dlistLinks[link].latLngs[1].lat,dlistLinks[link].latLngs[1].lng];
              latlngthree = [dlistLinks[link].latLngs[2].lat,dlistLinks[link].latLngs[2].lng];
              addLink(latlngone,latlngtwo);
              addLink(latlngtwo,latlngthree);
              addLink(latlngone,latlngthree);
              //console.log('added polygon');
              }
            }
          }
        }
      if (window.plugin.planar.listL.length > 0) {return true;}
      else {
        //console.log('nothing added', window.plugin.planar.listL);
        return false;
      }
    }


window.plugin.planar.linksTable = function() {
  //создаем таблицу для вывода списка линков
  var table, row, cell;
  var container = $('<div>');
  table = document.createElement('table');
  table.className = 'lp';
  window.plugin.planar.eventLoad();
  container.append(table);
  //console.log("build table ",window.plugin.planar.listL);
  window.plugin.planar.listL.forEach(function(link, i) {
    row = table.insertRow(-1);
    cell = row.insertCell(-1);
    $(cell)
      .text(link.num)
      .addClass("num");

    if (Object.keys(link.start).length == 4) {
      cell = row.insertCell(-1);
      cell.appendChild(getPortalLink(link.start));
      cell.className = "portalTitle";
    }
    cell = row.insertCell(-1);
    $(cell)
      .text("==>")
      .addClass("revlink")
      //.title("change link direction");
      .attr("idx", link.num);
    /*$(cell)
      .append('<a onclick="window.plugin.planar.chLinkDirect('+i+')" title="change link direction"> ==\> </a>')
      .click(function(event) {
        $("#planar").empty().append(window.plugin.planar.linksTable());
        event.stopImmediatePropagation();
        return false;
      });*/

    if (Object.keys(link.end).length == 4) {
      cell = row.insertCell(-1);
      cell.appendChild(getPortalLink(link.end));
      cell.className = "portalTitle";
      
    }
  });
  return container;
}

window.plugin.planar.eventLoad = function() {
  var plugin = $("#planar");
  plugin
    .find(".revlink")
    .click("click",function() {
        console.log('click on link',$(this).attr("idx"));
        window.plugin.planar.chLinkDirect($(this).attr("idx")-1);
        plugin.empty().append(window.plugin.planar.linksTable());
        //event.stopImmediatePropagation();
        //return false;
    });
    //.trigger(".revlink")
    //.unbind(".revlink");
  /*plugin
    .find(".num")
    .click(function(event) {
      $(this).empty()

      window.plugin.planar.chNumLink();
    });*/
  console.log('end adding events');
  return true;
  
}

window.plugin.planar.displayPL = function() {
  //1 функция, которая стартует по нажатию кнопки. От нее и пляшем.
  var list;

  if (window.plugin.planar.fillLinks()) {
    
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
      width: 700
    });
  }
  window.plugin.planar.eventLoad();
}

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
    .html("#plannar.mobile {\n  background: transparent;\n  border: 0 none !important;\n  height: 100% !important;\n  width: 100% !important;\n  left: 0 !important;\n  top: 0 !important;\n  position: absolute;\n  overflow: auto;\n}\n\n#plannar table {\n  margin-top: 5px;\n  /*border-collapse: collapse;*/\n  empty-cells: show;\n  width: 100%;\n  clear: both;\n  max-height: 90%;\n  \n}\n\n#plannar table td, #plannar table th {\n  /*background-color: #1b415e;*/\n  background-color: #017f01;\n  border-bottom: 1px solid #0b314e;\n  color: white;\n  padding: 3px;\n  border: 3px solid #060; /* Белая рамка */\n  border-radius: 5px; /* Радиус скругления */\n}\n\n#plannar table th {\n  text-align: center;\n}\n\n#plannar table .alignR {\n  text-align: right;\n}\n\n#plannar table.portals td {\n  white-space: nowrap;\n}\n\n#plannar table th.sortable {\n  cursor: pointer;\n}\n\n#plannar table .portalTitle {\n  min-width: 120px !important;\n  max-width: 240px !important;\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  background-color: #017f01;\n}\n\n#plannar .sorted {\n  color: #FFCE00;\n}\n\n#plannar table.filter {\n  table-layout: fixed;\n  cursor: pointer;\n  border-collapse: separate;\n  border-spacing: 1px;\n}\n\n#plannar table.filter th {\n  text-align: left;\n  padding-left: 0.3em;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n\n\n#plannar .disclaimer {\n  margin-top: 10px;\n  font-size: 10px;\n}\n\n#plannar.mobile table.filter tr {\n  display: block;\n  text-align: center;\n}\n#plannar.mobile table.filter th, #plannar.mobile table.filter td {\n  display: inline-block;\n  width: 22%;\n}\n\n")
    .appendTo("head");

}

// PLUGIN END //////////////////////////////////////////////////////////
// jshint ignore:start

setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);


// jshint ignore:end