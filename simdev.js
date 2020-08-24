
/**
 * @fileoverview
 * Javascript main code.
 */
var simdev  = simdev || {};
/* foo */
/**
 * @return a float value between 0 and 1 from a uniform distribution
 */
simdev.rand = function() {
  return Math.random();
};

/**
 * Pseudo-random generator for a Poisson distribution of parameter lambda.
 * Lambda must be strictly positive and is the mean and std dev of
 * the distribution.
 * P(X = n) = exp(-lambda) * lambda ^ n / n!
 * @return a positive integer following Poisson distribution.
 */
simdev.poisson = function(lambda) {
  var uniform = this.rand() * 100000;
  var pois = Math.exp(-lambda) * 100000;
  var cur = pois;
  var n = 0;
  while(true) {
    if(uniform <= cur)
      return n;
    n++;
    pois = pois * lambda / n;
    cur += pois;
  }
};

/**
 * Pseudo-random normal distribution centered on avg with
 * sigma standard deviation.
 *
 * This function uses the rand() function to approximate a normal
 * distribution from a uniform distribution.
 *
 * @param avg average value of distribution
 * @param sigma standard deviation of distribution
 * @return a real value following normal distribution.
 */
simdev.normal = function(avg, sigma) {
    return avg + (this.gaussRandom()*sigma);
};

/*
 * Returns random number in normal distribution centering on 0.
 * ~95% of numbers returned should fall between -2 and 2
 */
simdev.gaussRandom = function() {

    var u = 2*this.rand()-1;
    var v = 2*this.rand()-1;
    var r = u*u + v*v;
    /*if outside interval [0,1] start over*/
    if(r == 0 || r > 1) return this.gaussRandom();

    var c = Math.sqrt(-2*Math.log(r)/r);
    return u*c;
};

simdev.id = 1;

simdev.WorkItem = function(estimation) {
  this.estimation = estimation || 1;
  this.completion = 0;
  this.start = this.end = this.globalStart = this.globalEnd = 0;
  this.id = simdev.id++;
};

simdev.WorkItem.prototype = {

  realSize: function(deviation) {
    var size = (this.estimation   - this.completion) * simdev.normal(1,deviation);
    return size < 0 ? 0 : size;
  },

  toString: function() {
    return "W" + this.id  + " [" + this.globalStart + "," + this.globalEnd +"]";
  }

};

simdev.WorkPlace = function(capacity,deviation,slots,simulation) {
  this.capacity = capacity || 1;
  this.deviation = deviation || 0;
  this.wip = [];
  this.slots = slots || 1;
  this.inputQueue = [];
  this.outputQueue = [];
  this.contention = 0;
  this.slack = 0;
  this.simulation = simulation;
  this.cycletime = 0;
  this.processed = 0;
};

simdev.WorkPlace.prototype = {

  workOn: function(workItem) {
    this.wip.unshift(workItem);
    return this;
  },

  updateWipQueue: function(queue) {
    var wip = this.wip;
    var contention = 0;

    function increaseContention(i,item) {
	     contention += item.estimation;
    };

    $.each(queue,
	   function(i,item) {
	     wip.unshift(item);
	     increaseContention(i,item);
	   });

    if(this.inputQueue.map == undefined) {
      $.each(this.inputQueue,
	     increaseContention);
    } else {
      this.inputQueue.map(increaseContention);
    }

    this.contention = contention;
  },

  getTime: function() {
    return this.simulation ?  this.simulation.time : 0;
  },

    /**
     * Work sequentially on all WIP items.
     */
  work: function() {
    var len = this.wip.length;
    var slack = this.capacity;
    var notCompleted = [];
    while(slack > 0 && this.wip.length > 0) {
      var item = this.wip.shift();
      var size = item.realSize(this.deviation);
      if(slack >= size) {
	item.completed = true;
	item.end = this.getTime();
	this.outputQueue && this.outputQueue.unshift(item);
	item.completion = 0;
	slack -= size;
      } else {
	item.completion += slack;
	slack = 0;
	notCompleted.unshift(item);
      }
    }
    this.updateWipQueue(notCompleted);
    this.updateCycleTime();
    this.slack = slack;
    return this;
  },

  /**
   * Distribute evenly work on all items in WIP queue.
   */
  workParallel: function() {
    var len = this.wip.length;
    var itemCapacity = this.capacity / len;
    var slack = this.capacity;
    var notCompleted = [];
    for(var i = 0; i < len; i++) {
      var item = this.wip.shift();
      var size = item.realSize(this.deviation);
      if(itemCapacity >= size) {
	item.completed = true;
	this.outputQueue && this.outputQueue.unshift(item);
	item.end = this.getTime();
	item.completion = 0;
	slack -= size;
      } else {
	item.completion += itemCapacity;
	slack = 0;
	notCompleted.unshift(item);
      }
    }
    this.updateWipQueue(notCompleted);
    this.updateCycleTime();
    this.slack = slack;
    return this;
  },

  updateCycleTime: function() {

  },
  
  schedule: function() {
    while(this.wip.length < this.slots) {
      var item = this.inputQueue && this.inputQueue.shift();
      if(item) {
	this.processed++;
	this.wip.unshift(item);
      } else
	return;
    }
  },

  toString: function() {
    return 'place cap:' +  this.capacity + ", dev:"+ this.deviation;
  }
};

simdev.Simulation = function() {
  this.items = {};
  this.places = [];
  this.inputRate = 1;
  this.meanSize = 1;
  this.deviationSize = 1;
  this.input = {place: new simdev.WorkPlace()};
  this.output = {place: new simdev.WorkPlace()};
  this.time = 0;
  this.numInputs = 0;
  this.totalInputs = 0;
};

simdev.Simulation.prototype = {

  add: function(place,name) {
    if(name == 'input' || name == 'output')
      throw new Error('Cannot add workplace named "input" or "output"');
    this.places.unshift(place);
    this[name] = {place: place};
    return this;
  },

  remove: function(name) {
    var place = this[name];
    if(place && name != 'input' && name != 'output') {
      var idx = $.inArray(this.places,place);
      this.places.splice(idx,1);
      delete this[name];
      for(var prop in this) {
	if(this[prop].place && this[prop][name]) {
	  delete this[prop][name];
	}
      }
      return place.place;
    } else
      return null;
  },

  transition: function(from, rate, to) {
    if(this[to] && this[from] && from != 'output' && to != 'input')  {
      this[from][to] = rate;
      var acc = 0;
      for(var prop in this[from]) {
	if(prop == 'place' || prop == 'totalWeight')
	  continue;
	acc += this[from][prop];
      }
      this[from].totalWeight = acc;
    } else
      throw new Error('Cannot transition to non existent place');
  },

  newInputs: function() {
    var numInputs = Math.floor(simdev.poisson(this.inputRate));
    this.numInputs += numInputs;
    var inputs = [];
    for(var i = 0;i<numInputs;i++) {
      var item = new simdev.WorkItem(simdev.normal(this.meanSize,this.deviationSize));
      item.globalStart = this.time;
      inputs.push(item);
      this.items[item.id] = item;
      this.totalInputs += item.estimation;
    }
    return inputs;
  },

  dispatch: function(from) {
    var item = null;
    while(this[from]) {
      item = this[from].place.outputQueue.shift();
      if(!item)
	break;
      var r    = simdev.rand();
      var sum  = r * this[from].totalWeight;
      var acc  = 0;
      for(var prop in this[from]) {
	if(prop != 'place' && prop != 'totalWeight') {
	  acc += this[from][prop];
	  if(acc >= sum) {
	    this[prop].place.inputQueue.unshift(item);
	    item.start = item.end = this.time;
	    if(prop == 'output')
	      item.globalEnd = this.time;
	    break;
	  }
	}
      }
    }
  }
};