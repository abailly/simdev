
/*
 * Copyright (C) 2008 - OQube / Arnaud Bailly
 */
function doTest(){

    $ = jQuery;

    function setUp() {
      simdev.rand = function() {
	return 0.51;
      };
      jqUnit.defaultItem = new simdev.WorkItem();
      jqUnit.otherItem = new simdev.WorkItem();
      jqUnit.itemSize10 = new simdev.WorkItem(10);
      jqUnit.defaultPlace = new simdev.WorkPlace();
      jqUnit.placeCap2 = new simdev.WorkPlace(2,0);
      jqUnit.place2slots = new simdev.WorkPlace(2,0,2);
    }

    var simtests = new jqUnit.TestCase('SimDev Test',setUp,function() {});

    with (jqUnit) {
      module('a poisson generator');
      simtests.test('can generate pseudo-random numbers',
		    function() {
		      simdev.rand = function() {
			return Math.exp(-2);
		      };
		      equals(simdev.poisson(2),0,"get 0");
		      simdev.rand = function() {
			return Math.exp(-1);
		      };
		      equals(simdev.poisson(2),1,"get 1");
		      simdev.rand = function() {
			return 0.99999;
		      };
		      equals(simdev.poisson(2),10,"get 10");
		    });
      module('a Work Item');
        simtests.test('has a default estimated size of 1',
             function() {
               equals(defaultItem.estimation, 1,"incorrect default estimation");
             });

	simtests.test('can be built with a size',
             function() {
               equals(itemSize10.estimation, 10,"estimation");
             });

        simtests.test('real size equals estimation * (1 + random * deviation) ',
             function() {
	       simdev.rand = function() {
	         return 0.73;
	       };
	       ok(itemSize10.realSize(.2) - 12.0 > -0.2,"real size value");
	       ok(itemSize10.realSize(.1) - 11.0 > -0.2,"real size value");
	       simdev.rand = function() {
	         return 0.31;
	       };
	       ok(itemSize10.realSize(.1) - 9.0 > -0.2,"real size value");
             });

        simtests.test('real size cannot be lower than 0',
             function() {
	       simdev.rand = function() {
	         return 0.51;
	       };
	       itemSize10.completion = 11;
	       equals(itemSize10.realSize(.2), 0.0,"real size value");
             });

      module("a Work Place");
      simtests.test('has default capacity of 1, deviation of 0 & slots of 1',
	   function() {
	     equals(defaultPlace.capacity,1,"default capacity");
	     equals(defaultPlace.deviation,0,"default deviation");
	     equals(defaultPlace.slots,1,"default slots");
	   });

      simtests.test('can be built with a capacity & deviation',
	   function() {
	     var place = new simdev.WorkPlace(10,1,2);
	     equals(place.capacity,10,"capacity");
	     equals(place.deviation,1,"deviation");
	     equals(place.slots,2,"slots");
	   });

      simtests.test('completes Work Item if capacity exceeds real size of item',
	   function() {
	     placeCap2.workOn(defaultItem);
	     placeCap2.work();
	     ok(defaultItem.completed,"completed");
	     equals(placeCap2.wip.length,0,"wip queue length");
	   });

      simtests.test('updates progress on Work Item with capacity when lower than real size',
	   function() {
	     placeCap2.workOn(itemSize10);
	     placeCap2.work();
	     equals(itemSize10.completion,2,"in progress");
	     equals(placeCap2.wip.length,1,"wip queue length");
	   });

      simtests.test('completes Work Item if capacity exceeds real size minus completion',
	   function() {
	     defaultItem.completion = 2;
	     placeCap2.workOn(defaultItem);
	     placeCap2.work();
	     equals(placeCap2.wip.length,0,"wip queue length");
	     ok(defaultItem.completed,"completed");
	   });

      simtests.test('put work item in output queue if completed',
	  function() {
	    placeCap2.outputQueue = [];
	    placeCap2.workOn(defaultItem);
	    placeCap2.work();
	    equals(placeCap2.wip.length,0,"wip queue length");
	    equals(placeCap2.outputQueue.shift(),defaultItem,"output item completed");
	  });

      simtests.test('remove first work item from input queue when scheduling',
	  function() {
	    placeCap2.inputQueue = [defaultItem,otherItem];
	    placeCap2.schedule();
	    equals(placeCap2.wip.length,1,"wip queue length");
	    equals(placeCap2.wip[0],defaultItem,"wip queue length");
	  });

      simtests.test('remove n work item from input queue if has n slots',
	  function() {
	    place2slots.inputQueue = [defaultItem,otherItem];
	    place2slots.schedule();
	    equals(place2slots.wip.length,2,"wip queue length");
	    equals(place2slots.wip[1],defaultItem,"wip queue item");
	    equals(place2slots.wip[0],otherItem,"wip queue other item");
	  });

      simtests.test('remove available work item from input queue if has 2 slots',
	  function() {
	    place2slots.inputQueue = [defaultItem];
	    place2slots.schedule();
	    equals(place2slots.wip.length,1,"wip queue length");
	    equals(place2slots.wip[0],defaultItem,"wip queue item");
	  });

      simtests.test('remove 1 work item from input queue if has 1 slot free',
	  function() {
	    var thirdItem = new simdev.WorkItem();
	    place2slots.inputQueue = [defaultItem,otherItem];
	    place2slots.workOn(thirdItem);
	    place2slots.schedule();
	    equals(place2slots.wip.length,2,"wip queue length");
	    equals(place2slots.inputQueue.length,1,"inqueue length");
	    equals(place2slots.wip[1],thirdItem,"wip queue item");
	    equals(place2slots.wip[0],defaultItem,"wip queue other item");
	  });

      simtests.test('split capacity equally on 2 items in slots',
	  function() {
	    var item1 = new simdev.WorkItem(3);
	    var item2 = new simdev.WorkItem(3);
	    place2slots.workOn(item1);
	    place2slots.workOn(item2);
	    place2slots.workParallel();
	    equals(place2slots.wip.length,2,"wip queue length");
	    equals(item1.completion,1,"completion of item1");
	    equals(item2.completion,1,"completion of item2");
	  });

      simtests.test('partially completes its wip queue',
	  function() {
	    var item1 = new simdev.WorkItem(3);
	    item1.completion = 2;
	    var item2 = new simdev.WorkItem(3);
	    place2slots.workOn(item1);
	    place2slots.workOn(item2);
	    place2slots.workParallel();
	    equals(place2slots.wip.length,1,"wip queue length");
	    ok(item1.completed,"item1 completed");
	    equals(item2.completion,1,"completion of item2");
	  });

      module('a Simulation');
      simtests.test('can hold work places w/ names',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.add(place2slots,'start').add(defaultPlace,'finish');
	    equals(simul.places.length,2,"number of work places");
	    equals(simul.start.place,place2slots,"work place as a property");
	    equals(simul.finish.place,defaultPlace,"work place as a property");
	  });

      simtests.test('can remove work places w/ names',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.add(place2slots,'start').add(defaultPlace,'finish');
	    equals(simul.places.length,2,"number of work places");
	    var place = simul.remove('start');
	    equals(simul.places.length,1,"number of work places");
	    equals(simul.start,undefined,"work place is undefined as property");
	    equals(place,place2slots,"work place is returned");
	  });

      simtests.test('dont remove unexisting work places',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.add(place2slots,'start');
	    simul.remove('toto');
	    equals(simul.places.length,1,"number of work places");
	    ok(simul.start,"work place is defined");
	  });

      simtests.test('dont remove input or output',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.add(place2slots,'start');
	    ok(!simul.remove('output'),"work place not removed");
	    ok(!simul.remove('input'),"work place not removed");
	  });

      simtests.test('hold 2 special places named "input" and "output"',
	  function() {
	    var simul = new simdev.Simulation();
	    try {
	      simul.add(place2slots,'input');
	    } catch(e) {
	      ok(true,"cannot add named input");
	    }
	    try {
	      simul.add(defaultPlace,'output');
	    } catch(e) {
	      ok(true,"cannot add named output");
	    }
	    equals(simul.places.length,0,"number of work places");
	    expect(3);
	  });

      simtests.test('can set transition rate between two places if they exist',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.add(place2slots,'start');
	    simul.transition('start',2,'output');
	    equals(simul.places.length,1,"number of work places");
	    equals(simul.start.output,2,"transition factor from start to output");
	    try {
	      simul.transition('start',2,'toto');
	    } catch(e) {
	      ok(true,"cannot transition to 'toto'");
	    }
	    try {
	      simul.transition('toto',2,'start');
	    } catch(e) {
	      ok(true,"cannot transition from 'toto'");
	    }
	    expect(4);
	  });

      simtests.test('remove transition when to place is removed',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.add(place2slots,'start');
	    simul.add(defaultPlace,'default');
	    simul.transition('start',1,'default');
	    equals(simul.start.default,1,"transition factor defined");
	    simul.remove('default');
	    equals(simul.start.default,undefined,"transition factor from start to default undefined");
	  });

      simtests.test('cannot transition to input or from output',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.add(place2slots,'start');
	    try {
	      simul.transition('start',2,'input');
	    } catch(e) {
	      ok(true,"cannot transition to 'input'");
	    }
	    try {
	      simul.transition('output',2,'start');
	    } catch(e) {
	      ok(true,"cannot transition from 'output'");
	    }
	    expect(2);
	  });

      simtests.test('dispatch work items according to probability of transition',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.add(place2slots,'start');
	    simul.add(defaultPlace,'default');
	    simul.transition('start',2,'output');
	    simul.transition('start',1,'default');
	    place2slots.outputQueue = [defaultItem];
	    simdev.rand = function() {
	      return 0;
	    };
	    simul.dispatch('start');
	    equals(simul.output.place.inputQueue[0],defaultItem,"dispatch from start to output");
	    equals(simul.start.place.outputQueue.length,0,"item has moved, queue has length");
	    place2slots.outputQueue = [defaultItem];
	    simdev.rand = function() {
	      return 1;
	    };
	    simul.dispatch('start');
	    equals(simul['default'].place.inputQueue[0],defaultItem,"dispatch from start to default");
	    equals(simul.start.place.outputQueue.length,0,"item has moved, queue has length");
	  });

      simtests.test('dispatch does nothing if output Queue is empty',
		    function() {
		      var simul = new simdev.Simulation();
		      simul.add(place2slots,'start');
		      simul.add(defaultPlace,'default');
		      simul.transition('start',2,'output');
		      simul.transition('start',1,'default');
		      simul.dispatch('start');
		      equals(simul.start.place.outputQueue.length,0,"no item");
		      equals(simul.output.place.inputQueue.length,0,"no item");
		    });

      simtests.test('dispatch empties outputQueue',
		    function() {
		      var simul = new simdev.Simulation();
		      simul.add(place2slots,'start');
		      simul.add(defaultPlace,'default');
		      simul.transition('start',2,'output');
		      place2slots.outputQueue = [defaultItem,otherItem];
		      simul.dispatch('start');
		      equals(simul.start.place.outputQueue.length,0,"no item");
		      equals(simul.output.place.inputQueue.length,2,"no item");
		    });

      simtests.test('generate work item of mean size according to input rate',
	  function() {
	    var simul = new simdev.Simulation();
	    simul.inputRate = 2;
	    simul.meanSize = 2;
	    var inputs = simul.newInputs();
	    equals(inputs.length,2,"number of item generated");
	    ok(inputs[0].estimation - 4.67 < 0.1,"estimation for item");
	  });

      simtests.test('stores reference to all created work items',
		    function() {
		      var simul = new simdev.Simulation();
		      simdev.id = 1;
		      simul.inputRate = 2;
		      simul.meanSize = 2;
		      var inputs = simul.newInputs();
		      equals(simul.items[1].id, 1,"correct id");
		      equals(simul.items[2].id, 1,"correct id");
		   });
    }

}

jQuery(document).ready(
    function() {
        function waitForShow() {
            if(simdev)
                doTest();
            else
                setTimeout(waitForShow,200);
        }
        setTimeout(waitForShow,200);
    }
    );
