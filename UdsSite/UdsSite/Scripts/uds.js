var getObjectKeys = Object.keys;

var getObjectValues = function (obj) {
  var keys = getObjectKeys(obj);

  var result = [];

  for (var i = 0; i < keys.length; i++) {
    var value = obj[keys[i]];
    result.push(value);
  }

  return result;
}

var distinct = function (xs) {
  return xs.filter(function (x, i, xs) {
    return i === xs.indexOf(x);
  });
}

var identity = function (x) {
  return x;
}

var distribution = function (xs) {
  var result = {};
  for (var i = 0; i < xs.length; i++) {
    if (result[xs[i]]) {
      result[xs[i]]++;
    } else {
      result[xs[i]] = 1;
    }
  }

  return result;
}

var width = 800,
    height = 600;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-300)
    .linkDistance(60)
    .size([width, height]);

var gr = {};

gr.lightness = function (d) {
  return 50;
}

var avatar = d3.select(".avatar")
    .on("click", function (x) {
      var id = d3.select(this).attr("data-id");
      window.history.pushState(id, id, "/id" + id);
      loadData(id);
    });

var svg = d3.select("#graph-svg");
//var lines = new Array(20);
//
//for (var i = lines.length - 1; i >= 0; i--) {
//  lines[i] = [i * 30, 0, i * 30, 900];
//};
//
//svg.selectAll("line")
//  .data(lines)
//  .enter().append("line")
//  .attr("x1", function(d) { return d[0]; })
//  .attr("y1", function(d) { return d[1]; })
//  .attr("x2", function(d) { return d[2]; })
//  .attr("y2", function(d) { return d[3]; })
//  .style("stroke", "rgb(255,0,0)");

function render(graph) {
  var svg = d3.select("#graph-svg");

  gr.nodes = graph.nodes;
  gr.links = graph.links;

  gr.nodes
      .filter(function (x) { return x.id === gr.id; })
      .forEach(function (x) {
        x.x = 500;
        x.y = 400;
        x.fixed = 1;
      });

  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links)
    .enter().append("line")
      .attr("class", "link");

  var node = svg.selectAll(".node")
      .data(graph.nodes)
    .enter()
    .append("circle")
      .attr("class", "node")
      .attr("r", 8)
      .on("mouseover", function (d) {
        showAvatar(d);
      })
      .on("click", function (d) { d.fixed = true; }) // ws.send(d.id); })
      //.style("fill", function(d) { return color(d.cityId); })
      //.attr("fill", "url(#avatar)")

      //.style("stroke", function(d) { return d.gender ? "dodgerblue" : "violet"; })
      .call(force.drag);

  node.append("title")
      .text(function (d) { return d.firstName + ' ' + d.lastName; });

  force.on("tick", function () {
    link.attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });

    node.attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; });
  });
}

function gender() {
  gr.hue = genderColor;
  updateGraphColor();
}

function city() {
  svg.selectAll('.node')
    .data(gr.nodes)
    .transition()
    .style("fill", function (d) {
      return color(d.cityId % 10);
    });

  ws.send(JSON.stringify({ forId: gr.id, targetId: gr.id, typeName: "cities" }));
}

function updateGraphColor() {
  var svg = d3.select("#graph-svg");
  svg.selectAll('.node')
      .data(gr.nodes)
      //.transition()
      .style("fill", function (d) {
        return hsla(gr.hue(d), 90, gr.lightness(d), 1);
      });
}

function genderColor(d) {
  return d.gender ? 200 : 320;
}

function relatives() {
  svg.selectAll(".link")
        .data(gr.links)
        .transition()
        .attr("class", "link")
        .style("stroke", function (d) { return d.value ? 'red' : 'gray'; })
        .style("stroke-width", function (d) { return d.value ? 3 : 1; });
}

function grouped() {
  ws.send(JSON.stringify({ forId: gr.id, targetId: gr.id, typeName: "age" }));
}

function drawAge() {
  gr.lightness = function (d) {
    var result = gr.mean[d.id];
    if (result) {
      return 90 - gauss(result - gr.targetAge) * 40;
    } else {
      return 90;
    }
  };

  drawYears();
  updateGraphColor();
}

function drawYears() {
  var yearsDist = distribution(getObjectValues(gr.mean));

  var years = getObjectKeys(yearsDist).sort().map(function(x) {
    return { year: x, count: yearsDist[x] };
  });

  d3.select("#years").selectAll(".year")
      .data(years)
      .enter()
      .append("div")
      .attr("class", "year")
      .text(function(x) {
        return x.year;
      })
      .style("width", function(x) {
        return String(x.count * 10) + "px";
      })
      .on("mouseover", function (x) {
        var year = x.year;
        gr.lightness = function(y) {
          return 90 - gauss(gr.mean[y.id] - year, 4.0) * 40;
        }

        updateGraphColor();
      });

}

function gauss(x, n) {
  n = n || 16;
  return Math.pow(Math.E, -Math.pow(x, 2) / n);
}

function hsla(h, s, l, a) {
  return 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
}

function search(e) {
  svg.selectAll('.node')
      .data(gr.nodes)
      .transition()
      .style("opacity", function (d) {
        if (d.firstName.toLowerCase().includes(e.value.toLowerCase()) || d.lastName.includes(e.value.toLowerCase())) {
          return 1;
        } else {
          return 0.3;
        };
      });
}

ws = new WebSocket("ws://localhost:6002");
ws.onmessage = function (m) {
  var data = JSON.parse(m.data);

  if (data.typeName == "initial") {
    d3.select('#graph-svg').selectAll('.node').remove();
    d3.select('#graph-svg').selectAll('.link').remove();
    render(data.result);
  } else if (data.typeName == "age") {
    gr.mean = data.result;
    gr.targetAge = gr.mean[gr.id];
    drawAge();
  } else if (data.typeName == "cities") {
    gr.cities = data.result;
    showCities();
  }

}

ws.onclose = function () {
  console.log("ws is closed");
};

function loadData(id) {
  var id = parseInt(id);
  gr.id = id;
  ws.send(JSON.stringify({ forId: id, targetId: id, typeName: "initial" }));
}

function showAvatar(user) {
  avatar.attr("src", user.photoUrl)
    .attr("data-id", user.id);

  d3.select("#targetName")
    .text(user.firstName + ' ' + user.lastName);

  if (gr.cities) {
    d3.select("#targetCity")
      .text(gr.cities[user.cityId]);
  }

  if (gr.mean) {
    d3.select("#targetAge")
      .text(gr.mean[user.id]);
  }

  d3.select("#openUdsBtn")
    .attr("href", "/id" + user.id);

  d3.select("#openVkBtn")
    .attr("href", "https://vk.com/id" + user.id);
}

ws.onopen = function () {
  var id = window.location.pathname;
  loadData(id.substr(3));
};
