/*
 * Copyright (C) 2009 - OQube / Arnaud Bailly
 * This software is provided ASIS without any waranty. Use at your
 * own risk.
 *
 * Created on Wed Aug 19 2009
 */


/**
 * @fileoverview Sample simulation for 3-step development process.
 *
 * @author abailly@oqube.com
 * @version $Id$
 */

var sim1 = new simdev.Simulation();
sim1.deviationSize  = 8;
sim1.meanSize       = 10;
sim1.inputRate      = 1;

var thread = null;

function newStates() {
  return $.map($('#states').val().split(','), $.trim);
}

var stateStructure = "<div class=\"workplace\">" +
"	<h3></h3>" +
"	<div class=\"params\">" +
"	  <span class=\"capacity\"></span><div class=\"controls\"><img class=\"plus\" src=\"plus.gif\" /><img src=\"minus.gif\" class=\"minus\" /></div>" +
"	  <span class=\"deviation\"></span><div class=\"controls\"><img src=\"plus.gif\" class=\"plus\" /><img src=\"minus.gif\" class=\"minus\" /></div>" +
"	  <span class=\"slots\"></span><div class=\"controls\"><img src=\"plus.gif\" class=\"plus\" /><img src=\"minus.gif\" class=\"minus\" /></div>" +
"	</div>" +
"	<div class=\"metrics\">" +
"	  <span class=\"slack\"></span>, " +
"	  <span class=\"contention\"></span>" +
"	  <span class=\"cycletime\"></span>" +
"	</div>" +
"	<div class=\"in\"></div>" +
"	<div class=\"wip\"></div>" +
"	<div class=\"out\"></div>" +
"      </div>";

function makeStates(states) {
  $.each(states,
	 function(i,state) {
	   var place = new simdev.WorkPlace(4,0,1);
	   sim1.add(place,state);
	   var div = $(stateStructure).attr("id",state);
	   $("h3",div).html(state);
	   $(div).insertBefore("div#output");
	 });
}

function makeTransitions() {
  sim1.transition("input",1,"analysis");
  sim1.transition("analysis",1,"development");
  sim1.transition("development",9,"testing");
  sim1.transition("development",1,"analysis");
  sim1.transition("testing",4,"output");
  sim1.transition("testing",1,"development");
}

function Queue(sel) {
  this.queue = [];
  this.selector = sel;
  this.length = 0;
  this.total = 0;
};


Queue.prototype = {

  shift : function() {
    var item = this.queue.shift();
    if(item) {
      var elem = $("#W"+item.id);
      $(this.selector).remove("#W"+item.id);
      $("#parking").append(elem);
      this.length--;
      this.total -= item.estimation;
    }
    return item;
  },

  unshift: function(item) {
    var span = $("#W"+item.id);
    span.parent().remove("#W"+item.id);
    $(this.selector).append(span);
    this.queue.unshift(item);
    this.length++;
    this.total += item.estimation;
  },

  map: function(fun) {
    $.each(this.queue,
	   fun);
  }

};

function makeQueues() {
  var states = $.merge(["input","output"],newStates());

  $.each(states,
    function(i,item) {
	 sim1[item].place.inputQueue  = new Queue("#"+item+" div.in");
	 sim1[item].place.wip         = new Queue("#"+item+" div.wip");
	 sim1[item].place.outputQueue = new Queue("#"+item+" div.out");
       });
}

function createItems() {
    var ins = sim1.newInputs();
    $.each(ins,
	   function(i,item) {
	     var lbl = item.toString();
	     var div = $("<span></span>").attr("id","W" + item.id).html(lbl).addClass("item");
	     if(item.estimation < sim1.meanSize *2/3)
	       div.addClass("small");
	     else if (item.estimation > sim1.meanSize * 4/3)
	       div.addClass("large");
	     div.attr("style", "width: "+item.estimation * 3+"px");
	     sim1.input.place.outputQueue.unshift(item);
	     $("div#input div.out").append(div);
	   });
  };

function dispatchAll() {
  var states = $.merge(["input"],newStates());
  $.each(states,
	   function(i,place){
	     sim1.dispatch(place);
	  });
}

function dispatchQueues() {
  dispatchAll();
};

function schedule() {
  $.each(newStates(),
	 function(i,item){
	   sim1[item] && sim1[item].place.schedule();
	 });
};

function work() {
  $.each(newStates(),
	 function(i,item){
	   sim1[item] && sim1[item].place.work();
	  });
  sim1.time++;
};

var cache = {};

function updateData() {

  function updateHtml(name) {
    if(!cache[name]) {
     cache[name] = function() {
       var id = $(this).parent().parent().attr("id");
       $(this).html("" + sim1[id].place[name].toFixed(2));
     };
    }
    return cache[name];
  };

  $("#time").html(sim1.time);
  $("#numInputs").html("" + sim1.numInputs);
  $("#totalInputs").html("" + sim1.totalInputs.toFixed(2));
  $("#wipTotal").html("" + (sim1.totalInputs - sim1.output.place.inputQueue.total).toFixed(2));
  $("#outputTotal").html("" + sim1.output.place.inputQueue.total.toFixed(2));
  $("#outputThroughput").html("" + (sim1.output.place.inputQueue.total / sim1.time).toFixed(2));
  $.each(['slack','contention','cycletime','capacity','deviation', 'slots'],
	 function(i,item) {
	   $("span." + item).each(updateHtml(item));
	 });
  $('.item').each(function(i,itemdiv) {
		    var id = /W(.*)/.exec($(itemdiv).attr("id"))[1];
		    $(itemdiv).html(sim1.items[id].toString());
		  });
};

function ffwd() {
  createItems();
  dispatchAll();
  schedule();
  work();
  dispatchAll();
  updateData();
};

function play() {
  thread = setInterval(ffwd,1000);
};

function stop() {
  if(thread) {
    clearInterval(thread);
    thread = null;
  }
};

function lookupProperty(target) {
  return { prop: $(target).parent().prev().attr("class"),
	   id: $(target).parent().prev().parent().parent().attr("id")};
}

function plus(event) {
  var p = lookupProperty(event.target);
  sim1[p.id].place[p.prop] += 1;
}

function minus(event) {
  var p = lookupProperty(event.target);
  sim1[p.id].place[p.prop] -= 1;
}

function start() {
    makeStates(newStates());
    makeTransitions();
    makeQueues();
    $("div.controls img.plus").click(plus);
    $("div.controls img.minus").click(minus);
    $("#start").unbind("click",start);
};

function clear() {
  $.each(newStates(),
	 function(i,state) {
	   $("div#" + state).remove();
	   sim1.remove(state);
	 });
  $("#start").click(start);
};

$(function() {
    $("#start").click(start);
    $("#clear").click(clear);
    $("#ffwd").click(ffwd);
    $("#play").click(play);
    $("#stop").click(stop);
  });