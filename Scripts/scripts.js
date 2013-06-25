var eventsUri = "https://api.guildwars2.com/v1/events.json";
var worldNamesUri = "https://api.guildwars2.com/v1/world_names.json";
var mapNamesUri = "https://api.guildwars2.com/v1/map_names.json";
var mapTilesUri = "https://tiles.guildwars2.com/1/1/{z}/{x}/{y}.jpg";
var mapFloorUri = "https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=1";
var eventNamesUri = "https://api.guildwars2.com/v1/event_names.json";
var eventDetailsUri = "https://api.guildwars2.com/v1/event_details.json";

var intervalLength = 10000;

var map_names = {
    a: [],
    contains: function (id) {
        for (var i = 0; i < this.a.length; i++) {
            if (this.a[i].id == id)
                return true;
        }
        return false;
    }
};
var events, map_floor = {};
map_floor.GetMapByCenter = function (point) {
    var foundMap = null;
    for (var regionId in this.regions) {
        var region = this.regions[regionId];
        for (var mapId in region.maps) {
            var rect = region.maps[mapId].continent_rect
            if (point.x > rect[0][0] && point.x < rect[1][0] && point.y > rect[0][1] && point.y < rect[1][1]) {
                return $.extend({ id: mapId }, region.maps[mapId]);
            }
        }
    }
}
function translateX(x, aMin, aMax, bMin, bMax) { return ((x - aMin) / (aMax - aMin)) * (bMax - bMin) + bMin; }
function translateY(y, aMin, aMax, bMin, bMax) { return (1 - ((y - aMin) / (aMax - aMin))) * (bMax - bMin) + bMin; }
function unproject(coord) { return map.unproject(coord, map.getMaxZoom()); }
function project(latlng) { return map.project(latlng, map.getMaxZoom()); }

$(document).ready(function () {
    // Load map data
    $.getJSON(mapFloorUri, function (data) {
        map_floor.regions = data.regions;
        map_floor.texture_dims = data.texture_dims;
        LoadMap(data.texture_dims);
    });
    $.getJSON(mapNamesUri, function (data) {
        map_names.a = data;
    });

    // Load world (server) data
    $.getJSON(worldNamesUri, function (data) {
        data.sort(function (a, b) {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        })
        $.each(data, function () {
            $('#slctWorld').append($("<option></option>").attr('value', this.id).text(this.name));
        });

        $('#slctWorld').change(function () {
            UpdateAutoUrl();
            LoadEvents();
        });

        var worldId = getURLParameter('world_id');
        if (worldId != null) {
            $('#slctWorld').val(worldId);
        }

        UpdateAutoUrl();
        LoadEvents();
    });

    // Load event data
    $.getJSON(eventDetailsUri, function (data) {
        events = $.extend(events, data.events);
    });

    var rate = getURLParameter('rate');
    if (rate != null && isNaN(rate) == false)
        intervalLength = Math.max(rate, 1000);

});

// Layers global
var zoneGroup = L.layerGroup(),
    sectorGroup = L.layerGroup(),
    poiGroup = L.layerGroup(),
    waypointGroup = L.layerGroup(),
    vistaGroup = L.layerGroup(),
    heartGroup = L.layerGroup(),
    skillGroup = L.layerGroup(),
    eventGroup = L.layerGroup(),
    eventPrepGroup = L.layerGroup();
var poiIcon = L.icon({ iconUrl: 'Content/Images/poi.png' }),
    waypointIcon = L.icon({ iconUrl: 'Content/Images/waypoint.png' }),
    vistaIcon = L.icon({ iconUrl: 'Content/Images/vista.png' }),
    heartIcon = L.icon({ iconUrl: 'Content/Images/renown_heart.png' }),
    eventBossIcon = L.icon({ iconUrl: 'Content/Images/event_boss32.png' }),
    eventBossIconGrey = L.icon({ iconUrl: 'Content/Images/event_boss_grey.png' }),
    eventStarIcon = L.icon({ iconUrl: 'Content/Images/event_star32.png' }),
    eventStarIconGrey = L.icon({ iconUrl: 'Content/Images/event_star_grey.png' }),
    skillPointIcon = L.icon({ iconUrl: 'Content/Images/skill_point.png' });
skillPointIconGrey = L.icon({ iconUrl: 'Content/Images/skill_point_grey.png' });
var icons = {
    poi: poiIcon,
    waypoint: waypointIcon,
    vista: vistaIcon,
    //heart: heartIcon,
    event: eventStarIcon,
    eventPrep: eventStarIconGrey,
    eventGroup: eventBossIcon,
    eventGroupPrep: eventBossIconGrey,
    skill: skillPointIcon,
    skillPrep: skillPointIconGrey
};
function LoadMap(dims) {
    // Set Up Map
    map = L.map("map", {
        minZoom: 0,
        maxZoom: 7,
        crs: L.CRS.Simple
    }).setView([0, 0], 0);

    var southWest = unproject([0 - (dims[1] * 0.5), dims[1] * 1.5]);
    var northEast = unproject([dims[0] * 1.5, 0 - (dims[0] * 0.5)]);

    map.setMaxBounds(new L.LatLngBounds(southWest, northEast));

    L.tileLayer(mapTilesUri, { minZoom: 0, maxZoom: 7, continuousWorld: true })
        .addTo(map);

    map.on("moveend", PositionChanged);

    var overlayMaps = {
        "Sectors": sectorGroup,
        "<img class='legend' src='Content/Images/poi.png'/><span class='legend'>Points of Interest</span>": poiGroup,
        "<img class='legend' src='Content/Images/waypoint.png'/><span class='legend'>Waypoints</span>": waypointGroup,
        "<img class='legend' src='Content/Images/vista.png'/><span class='legend'>Vistas</span>": vistaGroup,
        "<img class='legend' src='Content/Images/renown_heart.png'/><span class='legend'>Renown Hearts</span>": heartGroup,
        "<img class='legend' src='Content/Images/skill_point.png'/><span class='legend'>Skill Challenges</span>": skillGroup,
        "<img class='legend' src='Content/Images/event_star.png'/><span class='legend'>Events (Active)</span>": eventGroup,
        "<img class='legend' src='Content/Images/event_star_grey.png'/><span class='legend'>Events (Preparation)</span>": eventPrepGroup
    };

    L.control.layers(null, overlayMaps).addTo(map);
    zoneGroup.addTo(map);
    // poiGroup.addTo(map);
    waypointGroup.addTo(map);
    // vistaGroup.addTo(map);
    // heartGroup.addTo(map);
    // skillGroup.addTo(map);
    eventGroup.addTo(map);
    eventPrepGroup.addTo(map);
}

var currentMap = { id: -1 };
function PositionChanged(e) {
    var mapobj = map_floor.GetMapByCenter(project(map.getCenter()));

    if (map.getZoom() < 4 || mapobj == null) {
        currentMap.id = -1;
        ClearAllLayers();
        StopEvents();
        SetZoneLayer();
        return;
    }
    else {
        zoneGroup.clearLayers();
    }


    if (currentMap.id == mapobj.id)
        return;

    currentMap = mapobj;
    ClearAllLayers();

    // Load map points
    for (var i = 0; i < mapobj.points_of_interest.length; i++) {
        var point = mapobj.points_of_interest[i];
        var wiki = 'http://wiki.guildwars2.com/wiki/Special:Search/' + point.name;
        switch (point.type) {
            case "landmark":
                poiGroup.addLayer(L.marker(unproject(point.coord), { title: point.name, icon: poiIcon })
                    .bindPopup('<div><a href="' + encodeURI(wiki) + '" target="_blank">' + point.name + '</a></div><div>' + getChatCode("map", point.poi_id) + '</div>')
                );
                break;
            case "waypoint":
                waypointGroup.addLayer(L.marker(unproject(point.coord), { title: point.name, icon: waypointIcon })
                    .bindPopup('<div><a href="' + encodeURI(wiki) + '" target="_blank">' + point.name + '</a></div><div>' + getChatCode("map", point.poi_id) + '</div>')
                );
                break;
            case "vista":
                vistaGroup.addLayer(L.marker(unproject(point.coord), { icon: vistaIcon }));
                break;
        }
    }

    // Load hearts
    for (i = 0; i < mapobj.tasks.length; i++) {
        var task = mapobj.tasks[i];
        var wiki = 'http://wiki.guildwars2.com/wiki/Special:Search/' + task.objective;
        if (wiki.substr(wiki.length - 1) == '.')
            wiki = wiki.substring(0, wiki.length - 1);
        var name = task.objective + " (" + task.level + ")";
        heartGroup.addLayer(L.marker(unproject(task.coord), { title: name, icon: heartIcon })
            .bindPopup('<a href="' + encodeURI(wiki) + '" target="_blank">' + name + '</a>')
        );
    }

    // Load skill challenges
    for (i = 0; i < mapobj.skill_challenges.length; i++) {
        skillGroup.addLayer(L.marker(unproject(mapobj.skill_challenges[i].coord), { icon: skillPointIcon }));
    }
    
    // Load Sectors
    for (i = 0; i < mapobj.sectors.length; i++) {
        var sector = mapobj.sectors[i];
        var sectorHtml = '<div><em>' + sector.name + '</em></div>';
        if (sector.level > 0)
            sectorHtml += '<div><em>(' + sector.level + ')</em></div>';
        var sectorIcon = L.divIcon({ html: sectorHtml, iconSize: [200, 32] });
        sectorGroup.addLayer(L.marker(unproject(sector.coord), { icon: sectorIcon, clickable: false, opacity: 0.7, zIndexOffset: -1000 }));
    }

    LoadEvents();
}

function SetZoneLayer() {
    for (var regionId in map_floor.regions) {
        var region = map_floor.regions[regionId];
        for (var mapId in region.maps) {
            if (map_names.contains(mapId) == false)
                continue;
            zone = region.maps[mapId];

            var coord = [zone.continent_rect[0][0] + (zone.continent_rect[1][0] - zone.continent_rect[0][0]) / 2,
                zone.continent_rect[0][1] + (zone.continent_rect[1][1] - zone.continent_rect[0][1]) / 2];
            var zoneHtml = '<div><em>' + zone.name + '</em></div>';
            if (zone.min_level > 0)
                zoneHtml += '<div><em>(' + zone.min_level + ' - ' + zone.max_level + ')</em></div>';
            var zoneIcon = L.divIcon({ html: zoneHtml, iconSize: [200, 32] });
            zoneGroup.addLayer(L.marker(unproject(coord), { icon: zoneIcon, clickable: false, opacity: 0.7, zIndexOffset: -1000 }));
        }
    }
}

function ClearAllLayers() {
    sectorGroup.clearLayers();
    poiGroup.clearLayers();
    waypointGroup.clearLayers();
    vistaGroup.clearLayers();
    heartGroup.clearLayers();
    skillGroup.clearLayers();
    StopEvents();
}

function getChatCode(type, id) {
    var header;
    switch (type) {
        case "map":
            header = String.fromCharCode(4);
            break;
    }
    return "[&" + btoa(header + String.fromCharCode(id % 256) + String.fromCharCode(Math.floor(id / 256)) + String.fromCharCode(0) + String.fromCharCode(0)) + "=]";
}

var intervalId;
function StopEvents() {
    eventGroup.clearLayers();
    eventPrepGroup.clearLayers();
    clearInterval(intervalId);
    intervalId = null;
}

function LoadEvents() {
    var worldId = $('#slctWorld').val();

    if (worldId == null || currentMap == null) {
        eventGroup.clearLayers();
        eventPrepGroup.clearLayers();
        clearInterval(intervalId);
        intervalId = null;
        return;
    }

    $.getJSON(eventsUri + "?world_id=" + worldId + "&map_id=" + currentMap.id, function (data) {
        eventGroup.clearLayers();
        eventPrepGroup.clearLayers();

        for (var i = 0; i < data.events.length; i++) {
            if (data.events[i].state != "Active" && data.events[i].state != "Preparation")
                continue;

            var event = events[data.events[i].event_id];
            var eventName = event.name;
            var icon = "event";
            var cssClass = 'event-name';
            var group = eventGroup;

            // check for Skill Challenge
            var skill = "Skill Challenge: ";
            if (eventName.slice(0, skill.length) == skill) {
                continue;
                eventName = eventName.substring(skill.length, eventName.length);
                cssClass += ' skill';
                icon = "skill";
            }

            // get wiki link
            var eventWiki = 'http://wiki.guildwars2.com/wiki/Special:Search/' + eventName;
            if (eventWiki.substr(eventWiki.length - 1) == '.')
                eventWiki = eventWiki.substring(0, eventWiki.length - 1);

            // check for group event
            if ($.inArray("group_event", event.flags) != -1) {
                eventName = '[Group] ' + eventName;
                cssClass += ' group-event';
                icon = "eventGroup";
            }

            eventName = eventName + " (" + event.level + ")";

            // check if event is in preparation stage
            if (data.events[i].state == "Preparation") {
                icon = icon + "Prep";
                eventName = eventName + " (Preparation)";
                group = eventPrepGroup;
            }

            var point = [translateX(event.location.center[0]
                , currentMap.map_rect[0][0]
                , currentMap.map_rect[1][0]
                , currentMap.continent_rect[0][0]
                , currentMap.continent_rect[1][0])
                , translateY(event.location.center[1], currentMap.map_rect[0][1], currentMap.map_rect[1][1], currentMap.continent_rect[0][1], currentMap.continent_rect[1][1])
            ];
            group.addLayer(L.marker(unproject(point), { title: eventName, icon: icons[icon] })
                .bindPopup('<a href="' + encodeURI(eventWiki) + '" target="_blank">' + eventName + '</a>')
            );
        }

        if (intervalId == null)
            intervalId = setInterval(function () { LoadEvents(); }, intervalLength);
    });
}

function UpdateAutoUrl() {
    var worldId = $('#slctWorld').val();
    // var mapId = $('#slctMap').val();

    if (worldId == null) {
        $('#autoUrl').hide();
        return;
    }
    var url = location.protocol + '//' + location.host + location.pathname + "?world_id=" + worldId;
    $('#autoUrl').attr('href', url).text(url).show();
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
}