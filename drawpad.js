(function(){
	var mouseClicked = false,
		mouseIn = false,
		mouseInner = false,
		historyPad = new Array(),
		historyEvent = new Array(),
		historyEventAxis = new Array(),
		historyStep = 0,
		historyAllStep = 0,
		historyMinStep = 0,
		lastX = 0, lastY = 0,
		lastMouseClickedState = false,
		lastMouseInState = false;

	var mouse = {
		pos: {x: 0, y: 0}
	};
	
	window.saveE = historyEvent;
	
	$(document).ready(function (){
		pad.init($("#drawpad-layers"),$("#drawpadup"));
		
		$(document).keypress(callKeyFunction);
		$(".replay").click(history.replay);
		
		startPadListener();
	});
	
	// Pad listener
	// Main interval to record all events
	function startPadListener(){
		setInterval(function(){
			if(history.data.replayState) return false;
			modes[style.draw].eventTrigger();
		}, settings.TIME_DELAY);
	}
	
	function callKeyFunction(e){
		if(mouseIn){
			key = String.fromCharCode(e.keyCode).toLowerCase();
			if(key == 'z'){
				history.undo();
			}else if(key == 'x'){
				history.redo();
			}
		}
	}
	
	tempFunc = {
		clearCanvas: function(){
			this.context.clearRect(0, 0, settings.CANVAS_WIDTH, settings.CANVAS_HEIGHT);
		},
		setIndex: function(i){
			this.$.css('z-index', i);
		},
		layer: function(lid){
			return {
				id: lid,
				name: 'Layer' + lid,
				$: false,
				element: false,
				context: false,
				clear: tempFunc.clearCanvas,
				setIndex: tempFunc.setIndex,
				init: tempFunc.layerInit
			}
		},
		layerInit: function(jque){
			this.$ = jque;
			this.element = jque[0];
			this.context = jque[0].getContext('2d');
		}
	}
		
	var pad = {
		lay: function(i){
			if(i == undefined) i = style.layer;
			return this.layer.data[i];
		},
		write: function(){
			return this.layer.write;
		},
		layer: {
			write: tempFunc.layer('write'),
			root: false,
			layerCount: 0,
			create: function(e){
				id = this.layerCount++;
				layer = tempFunc.layer(id);
				canvas = $("<canvas></canvas>").attr({
					'id': 'drawpad_' + id,
					'width': settings.CANVAS_WIDTH,
					'height': settings.CANVAS_HEIGHT
				}).addClass('drawpad').css('z-index', 10 + id);
				this.root.append(canvas);
				layer.init(canvas);
				
				if(e === undefined)
					modes[modes.defineMode.CreateLayer].eventSave();
				this.data.push(layer);
			},
			remove: function(i){
				this.data[i].$.remove();
				this.data.splice(i, 1);
			},
			removeAll: function(i){
				$.each(this.data, function(i, o){
					o.$.remove();
				});
				this.data = [];
				this.layerCount = 0;
			},
			change: function(i){
				style.layer = i;
				this.write.css('z-index', 10 + i);
			},
			clear: function(){
				$.each(this.data, function(i, o){
					o.clear();
				});
			},
			data: []
		},
		setStyle: function(colorRGBAInt, width, alpha){
			rgba = this.RGBA.getRGBA(colorRGBAInt);
			rgbaCSS = this.RGBA.getCSSFromInt(colorRGBAInt);

			alpha = rgba.alpha / 255;
			this.write().context.strokeStyle = rgbaCSS;
			this.write().context.fillStyle = rgbaCSS;
			this.write().context.lineWidth = width;
			this.lay().context.globalAlpha = alpha;
			
			this.write().$.css('opacity', alpha);
		},
		init: function(jqueLayers, jqueWrite){
			this.layer.root = jqueLayers;
			this.layer.create();
			
			// set Event
			$(document).mousemove(this.mouseEvent.move);
			$(window).mousedown(this.mouseEvent.down);
			$(window).mouseup(this.mouseEvent.up);

			this.write().$ = jqueWrite;
			this.write().element = jqueWrite[0];
			this.write().context = this.write().element.getContext('2d');
		},
		RGBA: {
			getInt: function(rgba){
				color = rgba.red;
				color = (color << 8) + rgba.green;
				color = (color << 8) + rgba.blue;
				color = (color << 8) + rgba.alpha;
				return color;
			},
			getRGBA: function(rgba){
				r = (rgba >> 24) & 0xFF;
				g = (rgba >> 16) & 0xFF;
				b = (rgba >> 8 ) & 0xFF;
				a = (rgba)       & 0xFF;
				return {red: r, green: g, blue: b, alpha: a};
			},
			getCSS: function(rgba){
				return "rgb(" + rgba.red + ", " + rgba.green + ", " + rgba.blue + ")";
			},
			getCSSFromInt: function(rgbaInt){
				rgba = this.getRGBA(rgbaInt);
				return this.getCSS(rgba);
			}
		},
		position: {
			offset: 1024,
			getInt: function(pos){
				pi = (pos.x + this.offset);
				pi = (pi << 12) + (pos.y + this.offset);
				return pi;
			},
			getPos: function(pi){
				pos = {
					x: ((pi >> 12) & 0xFFF) - this.offset,
					y: ((pi)       & 0xFFF) - this.offset
				}
				return pos;
			},
			compare: function(pos1, pos2){
				return pos1.x == pos2.x && pos1.y == pos2.y;
			}
		}
	};
	
	var	settings = pad.settings = {
		TIME_DELAY: 20,
		CANVAS_WIDTH: 800,
		CANVAS_HEIGHT: 480,
		CANVAS_EVENTOFFSET: 100,
		HISTORY_LIMIT: 100,
		SAMEPOINT_LIMIT: 1,
		replaySpeed: 1
	};
	
	window.pad = pad;
	
	var style = pad.style = {
		color: pad.RGBA.getInt({
			red: 0, green: 0, blue: 0,
			alpha: 100
		}),
		width: 20,
		draw: 0, // line
		layer: 0,
	};

	var history = pad.history = {
	/* key funciton */
		undo: function (){
			if(historyStep > 0 && (historyPad[historyStep - 2] != undefined || historyStep == 1)){
				historyObject = historyPad[--historyStep - 1];
				pad.layout.change(historyObject.layer);

				pad.lay().clear();
				img = new Image();
				img.src = historyObject.data;
				img.onload = function(){ 
					pad.lay().context.globalAlpha = 1;
					pad.lay().context.drawImage(img, 0, 0) 
				};
			}
		},
		redo: function (){
			if(history.haveRedo()){
				historyObject = historyPad[historyStep++];
				pad.layout.change(historyObject.layer);
				
				pad.lay().clear();
				img = new Image();
				img.src = historyObject.data;
				img.onload = function(){ pad.lay().context.drawImage(img, 0, 0) };
			}
		},
		clearRedo: function(){
			historyPad.length = historyStep;
			historyEvent.length = historyStep;
		},
		clearRedoPad: function(step){
			historyPad.length = step;
		},
		haveRedo: function(){
			return historyStep < historyPad.length;
		},
		haveUndo: function(){
			return historyStep > 0 && historyStep >= historyMinStep;
		},
		count: function(){
			historyStep++;
		},
		timeCount: function(){
			historyAllStep++;
		},
		save: function(){
			if(history.haveRedo())
				history.clearRedo();
			
			// Save only settings.HISTORY_LIMIT historys for undo
			if(historyPad.length >= settings.HISTORY_LIMIT){
				historyPad[historyPad.length - settings.HISTORY_LIMIT] = undefined;
				historyMinStep = historyPad.length - settings.HISTORY_LIMIT;
			}
			
			img = pad.write().element.toDataURL();
			imgO = new Image();
			imgO.onload = function(){
				pad.write().clear();
				pad.lay().context.drawImage(imgO, 0, 0);
				historyPad.push({
					layer: style.layer,
					data: pad.lay().element.toDataURL()
				});
			};
			imgO.src = img;
			
		},
		replay: function(){
			if(history.data.replayState) return false;
			history.data.replayState = true;
			pad.layer.removeAll();
			pad.write().clear();
			
			timeIndex = 0;
			eventIndex = 0;
			endLength = historyEvent.length;
			history.clearRedoPad(0);
			function timeout(){
				while(historyEvent[eventIndex][modes.define.time] <= timeIndex){
					modes[historyEvent[eventIndex][modes.define.drawType]]
						.play(historyEvent[eventIndex]);
					eventIndex++;
					if(eventIndex >= endLength){
						history.data.replayLastState = true;
						return true;
					}
				}
				setTimeout(timeout, settings.TIME_DELAY / settings.replaySpeed);
				console.log("[REPLAY] time = " + timeIndex);
				timeIndex++;
			};
			timeout();
		},
		data: {
			replayState: false,
			replayLastState: false
		},
		replayResetState: function(){
			if(history.data.replayLastState){
				history.data.replayLastState = false;
				history.data.replayState = false;
			}
		},
		getSize: function(){
			return JSON.stringify(historyEvent).length;
		},
		getMsgPackSize: function(){
			return msgpack.pack(historyEvent).length;
		}
	};
						
	var modes = pad.modes = {
		get: function(str){
			if(this.defineMode[str]	=== undefined) return function(){};
			return this[this.defineMode[str]];
		},
		defineMode: {
			Line: 0,
			CreateLayer: 1
		},
		0: {
			name: "Line",
			thisIndex: 0,
			dataCheck: function(data){
				return data[modes.define.drawType] === this.thisIndex;
			},
			play: function(data){
				window.lastData = data;
				d = modes.define;
				if(!this.dataCheck(data)) return false;
				if(data[d.axis].length < 2) return true;

				pad.layer.change(data[d.layer]);				
				pad.setStyle(data[d.color], data[d.width]);
					
				iNow = 1;
				dataLength = data[d.axis].length;
				dThis = this;

				function time(){
					cP = pad.position.getPos(data[d.axis][iNow - 1]);
					cN = pad.position.getPos(data[d.axis][iNow]);
					dThis.draw(cP, cN);
					iNow++;
					if(iNow >= dataLength - 1){
						history.save();
						history.replayResetState();
						return;
					}
					setTimeout(function(){ time(); } , settings.TIME_DELAY / settings.replaySpeed);
				}
				setTimeout(function(){ time(); } , settings.TIME_DELAY / settings.replaySpeed);
			},
			instantPlay: function(data){
				d = modes.define;
				if(!this.dataCheck(data)) return false;
				if(data[d.axis].length < 2) return true;

				pad.layer.change(data[d.layer]);				
				pad.setStyle(data[d.color], data[d.width]);
				window.lastData = data;

				for(i = 1; i < dataLength; i++){
					cP = data[d.axis][i - 1];
					cN = data[d.axis][i];
					draw({x: cP[0], y: cP[1]}, {x: cN[0], y: cN[1]});
				}			
				history.save();
			},
			draw: function (cStart, cNow){
				if(pad.position.compare(cStart, cNow)){
					cNow.x++; cNow.y++;
				}
				context = pad.write().context;
				context.beginPath();
				context.lineJoin = 'round';
				context.lineCap = 'round';
				context.moveTo(cStart.x, cStart.y);
				context.lineTo(cNow.x , cNow.y);
				context.closePath();
				context.stroke();
			},
			eventTrigger: function(){
				// If click state change
				if(lastMouseClickedState != mouseClicked){
					if(mouseInner){
						if(mouseClicked) this.eventStart();
						else{
							this.eventStop();
						}
					}else{
						if(!mouseClicked) this.eventStop();
					}
				}else if(mouseClicked && mouseIn){
					if(lastMouseInState != mouseIn){
						if(mouseIn) this.eventStart();
						else this.eventStop();
					}
					else if(this.data.drawState) this.eventAdd();
				}else if(!mouseIn){
					this.eventStop();
				}
				lastMouseClickedState = mouseClicked;
				lastMouseInState = mouseIn;
				if(this.data.drawState) $("#flowzone").show();
				else $("#flowzone").hide();
			},
			eventStart: function(){
				console.log("Start Active!")
				this.data.drawState = true;

				pos = $.extend({}, mouse.pos);
				historyEventAxis = new Array();
				historyEventAxis.push(pad.position.getInt(pos));
				this.data.lastMouse = pos;
				
				pad.setStyle(style.color, style.width);
				history.timeCount();
				//this.eventAdd();
			},
			eventAdd: function(){				
				pos = $.extend({}, mouse.pos);
				drawpoint = false;
				if(pad.position.compare(pos, this.data.lastMouse)){
					this.data.lastSamePoint++;
				}else this.data.lastSamePoint = 0;
				
				if(this.data.lastSamePoint > settings.SAMEPOINT_LIMIT) return false;

				// Add to Pad
				this.draw(this.data.lastMouse, pos);
				
				// Add to historyObject
				historyEventAxis.push(pad.position.getInt(pos));
				
				this.data.lastMouse = pos;
				history.timeCount();
			},
			eventStop: function(e){
				if(this.data.drawState){
					this.data.drawState = false;
				}else return false;
				
				console.log("Stop Active!");
				if(e === undefined)
					this.eventAdd();

				this.data.lastSamePoint = 0;
				this.eventSave();
				history.save();
				history.count();
				$("#value_jsize").html((history.getSize() / 1024).toFixed(2) + " KB");
				$("#value_msize").html((history.getMsgPackSize() / 1024).toFixed(2) + " KB");
			},
			eventSave: function(){
				data = {};
				data[modes.define.drawType] = this.thisIndex;
				data[modes.define.width]    = style.width;
				data[modes.define.color]    = style.color;
				data[modes.define.time]     = historyAllStep - historyEventAxis.length;
				data[modes.define.axis]     = historyEventAxis;
				data[modes.define.layer]    = style.layer;
				historyEvent.push(data);
			},
			data: {
				lastMouse: {x: 0, y: 0},
				drawState: false,
				lastSamePoint: 0,
			},
		},
		1: {
			name: "Create Layer",
			thisIndex: 1,
			dataCheck: function(data){
				return data[modes.define.drawType] === this.thisIndex;
			},
			play: function(data){
				d = modes.define;
				if(!this.dataCheck(data)) return false;
				pad.layer.create(false);
			},
			eventTrigger: function(){},
			eventSave: function(){
				data = {};
				data[modes.define.drawType] = this.thisIndex;
				data[modes.define.time]     = historyAllStep,
				historyEvent.push(data);
			}
		},
		define: {
			drawType: 0,
			width: 1,
			color: 2,
			time: 3,
			axis: 4,
			layer: 5
		}
	}

	// Event
	var mouseEvent = pad.mouseEvent = {
		down: function (){
			mouseClicked = true;
		},	
		up: function (){
			mouseClicked = false;
		},
		move: function (e){
			off = pad.write().$.offset();
			
			mouse.pos.x = e.pageX - off.left;
			mouse.pos.y = e.pageY - off.top;
			$("#value_x").html(mouse.pos.x);
			$("#value_y").html(mouse.pos.y);
			
			mouseEvent.overcheck();
		},
		overcheck: function (){
			if( mouse.pos.x >= -settings.CANVAS_EVENTOFFSET &&
				mouse.pos.x <= settings.CANVAS_WIDTH + settings.CANVAS_EVENTOFFSET &&
				mouse.pos.y >= -settings.CANVAS_EVENTOFFSET &&
				mouse.pos.y <= settings.CANVAS_HEIGHT + settings.CANVAS_EVENTOFFSET )
				mouseIn = true;
			else
				mouseIn = false;

			if( mouse.pos.x >= 0 &&
				mouse.pos.x <= settings.CANVAS_WIDTH &&
				mouse.pos.y >= 0 &&
				mouse.pos.y <= settings.CANVAS_HEIGHT )
				mouseInner = true;
			else
				mouseInner = false;
		}
	}
	
	// Cursor
	var cursor = pad.cursor = {
		trigger: function(){
			if(mouseIn){
			
			}else{
			
			}
		}
	}

})();