// ==UserScript==
// @id             iitc-plugin-planar@teo96
// @name           IITC plugin: show list of links
// @category       Info
// @version        0.2.1.@@DATETIMEVERSION@@
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
"use strict";
//jshint ignore:start
@@PLUGINSTART@@ 
// jshint ignore:end

// PLUGIN START ////////////////////////////////////////////////////////
// use own namespace for plugin
window.plugin.planar = function() {};
window.plugin.planar.listL = []; //основной список линков, с которым будем работать

/*globals window, console, $, android, addHook, dialog, document*/
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

    function findBylatlngE6 (latlng) {
      var latE6 = formatlatlngE6(latlng[0]);
      var lngE6 = formatlatlngE6(latlng[1]);
      for(var guid in window.portals) {
        var data = window.portals[guid]._latlng;
        //console.log(data,[latE6, lngE6],window.portals[guid].options.data.title);
        if(data.lat == latE6 && data.lng == lngE6) {
          window.plugin.bookmarks.switchStarPortal(guid);
          //console.log(window.portals[guid]);
          return getportalarr(window.portals[guid]);
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
      console.log(portal);
      dic.guid = portal.options.guid;
      dic.title = portal.options.data.title;
      dic.lat = portal._latlng.lat;
      dic.lng = portal._latlng.lng;
      return dic;
    }

    function addLink(one, two) {
      console.log(one,two);
      var guid11 = findBylatlng(one);
      var guid12 = findBylatlngE6(one);
      var guid21 = findBylatlng(two);
      var guid22 = findBylatlngE6(two);
      var count = window.plugin.planar.listL.length;
      window.plugin.planar.listL[count] = {};
      //console.log('adding link', guid11, guid12, guid21, guid22);
      if (guid11 !== undefined) {
        //console.log(guid1,portal,window.portals[guid1]);
        window.plugin.planar.listL[count].start = guid11;
      }
      else if (guid12 !== undefined) {
        window.plugin.planar.listL[count].start = guid12;
      }
      else {
        one[0] = formatlatlngE6(one[0]);
        one[1] = formatlatlngE6(one[1]);
        window.plugin.planar.listL[count].start = one.join(", ");
      }
      if (guid21 !== undefined) {
        window.plugin.planar.listL[count].end = guid21;
      }else if (guid22 !== undefined) {
        window.plugin.planar.listL[count].end = guid22;
      }
      else {
        two[0]=formatlatlngE6(two[0]);
        two[1]=formatlatlngE6(two[1]);
        window.plugin.planar.listL[count].end = two.join(", ");
      }
      console.log('in listL ',window.plugin.planar.listL[window.plugin.planar.listL.length-1]);
      console.log('total ',window.plugin.planar.listL);
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
          console.log('added line ',latlngone,latlngtwo);
          }
        else {
          if (dlistLinks[link].type === "polyline" && dlistLinks[link].latLngs.length > 2) {
            for (var i=1; i<dlistLinks[link].latLngs.length; i++) {
              latlngone = [dlistLinks[link].latLngs[i-1].lat,dlistLinks[link].latLngs[i-1].lng];
              latlngtwo = [dlistLinks[link].latLngs[i].lat,dlistLinks[link].latLngs[i].lng];
              addLink(latlngone,latlngtwo);
              console.log('added polyline ',latlngone,latlngtwo);
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
              console.log('added polygon');
              }
            }
          }
        }
      if (window.plugin.planar.listL.length > 0) {return true;}
      else {
        console.log('nothing added', window.plugin.planar.listL);
        return false;
      }
    }


window.plugin.planar.linksTable = function() {
  //создаем таблицу для вывода списка линков
  var table, row, cell;
  var container = $('<div>');
  table = document.createElement('table');
  table.className = 'lp';
  
  container.append(table);
  console.log("build table ",window.plugin.planar.listL);
  window.plugin.planar.listL.forEach(function(link, i) {
    row = table.insertRow(-1);
    cell = row.insertCell(-1);
    cell.appendChild(document.createTextNode(i+1));
    if (typeof(link.start) == "string") {
      cell = row.insertCell(-1);
      cell.appendChild(document.createTextNode(link.start));
    }
    else if (Object.keys(link.start).length == 4) {
      cell = row.insertCell(-1);
      cell.appendChild(getPortalLink(link.start));
      cell.className = "portalTitle";
    }
    cell = row.insertCell(-1);
    $(cell).append('<a onclick="window.plugin.planar.chLinkDirect('+i+')" title="change link direction"> ==\> </a>');
    $(cell).click(function(event) {
      $("#planar").empty().append(window.plugin.planar.linksTable());
      event.stopImmediatePropagation();
      return false;
    });

    if (typeof(link.end) == "string") {
      cell = row.insertCell(-1);
      cell.appendChild(document.createTextNode(link.end));
    }
    else if (Object.keys(link.end).length == 4) {
      cell = row.insertCell(-1);
      cell.appendChild(getPortalLink(link.end));
      cell.className = "portalTitle";
      
    }
  });
  return container;
}

window.plugin.planar.displayPL = function() {
  //1 функция, которая стартует по нажатию кнопки. От нее и пляшем.
  var list;
  window.plugin.planar.listL = [];

  if (window.plugin.planar.fillLinks()) {
    list = window.plugin.planar.linksTable();
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
    .html("@@INCLUDESTRING:plugins/portals-list.css@@")
    .appendTo("head");

}

// PLUGIN END //////////////////////////////////////////////////////////
// jshint ignore:start
@@PLUGINEND@@
// jshint ignore:end