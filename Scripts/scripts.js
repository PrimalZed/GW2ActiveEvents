var eventsUri = "https://api.guildwars2.com/v1/events.json";
var worldNamesUri = "https://api.guildwars2.com/v1/world_names.json";
var mapNamesUri = "https://api.guildwars2.com/v1/map_names.json";
var eventNamesUri = "https://api.guildwars2.com/v1/event_names.json";

var intervalLength = 10000;

var maps = {
    Pairs: [],
    Add: function (map) { this.Pairs.push(map); },
    Get: function (id) {
        var result = $.grep(this.Pairs, function (map) { return map.id == id; });
        if (result.length == 0) return '';
        return result[0].name;
    }
};
var events = {
    Pairs: [],
    Add: function (event) { this.Pairs.push(event); },
    Get: function (id) {
        var result = $.grep(this.Pairs, function (event) { return event.id == id; });
        if (result.length == 0) return '';
        return result[0].name;
    }
};
$(document).ready(function () {
    $.getJSON(eventNamesUri, function (data) {
        $.each(data, function () {
            events.Add(this);
        });

        if ($('#content tr').length > 0)
            LoadTable();
    });

    var rate = getURLParameter('rate');
    if (rate != null && isNaN(rate) == false)
        intervalLength = Math.max(rate, 1000);

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
            LoadTable();
        });

        var worldId = getURLParameter('world_id');
        if (worldId != null) {
            $('#slctWorld').val(worldId);
        }

        UpdateAutoUrl();
        LoadTable();
    });
    $.getJSON(mapNamesUri, function (data) {
        data.sort(function (a, b) {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        })
        $.each(data, function () {
            $('#slctMap').append($("<option></option>").attr('value', this.id).text(this.name));
        });

        $('#slctMap').change(function () {
            UpdateAutoUrl();
            LoadTable();
        });

        var mapId = getURLParameter('map_id');
        if (mapId != null) {
            $('#slctMap').val(mapId);
        }

        UpdateAutoUrl();
        LoadTable();
    });
});

function StateOrder(state) {
    switch (state) {
        case "Active":
            return 1;
        case "Preparation":
            return 2;
        case "Warmup":
            return 3;
        case "Success":
            return 4;
        case "Fail":
            return 5;
    }
}

var intervalId;
function LoadTable() {
    var worldId = $('#slctWorld').val();
    var mapId = $('#slctMap').val();

    if (worldId == null || mapId == null) {
        $('#content tr').remove();
        clearInterval(intervalId);
        intervalId = null;
        return;
    }

    $.getJSON(eventsUri + "?world_id=" + worldId + "&map_id=" + mapId, function (data) {
        $('#content tr').remove();
        data.events.sort(function (a, b) {
            return StateOrder(a.state) - StateOrder(b.state);
        })

        $.each(data.events, function () {
            // get event name
            var eventName = events.Get(this.event_id);
            var cssClass = 'event-name';

            // check for Skill Challenge
            var skill = "Skill Challenge: ";
            if (eventName.slice(0, skill.length) == skill) {
                eventName = eventName.substring(skill.length, eventName.length);
                cssClass += ' skill';
            }

            // get wiki link
            var eventWiki = 'http://wiki.guildwars2.com/wiki/Special:Search/' + eventName;
            if (eventWiki.substr(eventWiki.length - 1) == '.')
                eventWiki = eventWiki.substring(0, eventWiki.length - 1);

            // check for group event
            var groupEvent = '';
            if ($.inArray(this.event_id, groupevents) != -1) {
                eventName = '[Group] ' + eventName;
                cssClass += ' group-event';
            }

            $('#content').append($('<tr class="' + this.state + '">' +
                '<td class="' + cssClass + '"><a href="' + encodeURI(eventWiki) + '" target="_blank">' + eventName + '</a></td>' +
                '<td>' + this.state + '</td>' +
                '</tr>'));
        });

        //if (intervalId == null)
        //    intervalId = setInterval(function () { LoadTable(); }, intervalLength);
    });
}

function UpdateAutoUrl() {
    var worldId = $('#slctWorld').val();
    var mapId = $('#slctMap').val();

    if (worldId == null || mapId == null) {
        $('#autoUrl').hide();
        return;
    }
    var url = location.protocol + '//' + location.host + location.pathname + "?world_id=" + worldId + "&map_id=" + mapId;
    $('#autoUrl').attr('href', url).text(url).show();
    
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
}
