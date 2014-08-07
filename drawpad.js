(function($){
	if($ == undefined) return false;
	var mouseClicked = false,
		mouseIn = false,
		mouseInner = false,
		historyPad = new Array(),
		historyEvent = new Array(),
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
		padC.init($("#wrap"), $("#layer-container"));
		pad.init($("#drawpad-layers"), $("#drawpad-writer"));
		
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

	
	/* Pad Controller
	   Require: jQuery
	*/
	var padC = padController = {
		settings: {
			PAD_LAYER_WIDTH: 150
		},
		DOM: {
			layerContainer: false,
			overall: false
		},
		layer: {
			select: function(i){
				pad.layer.index(i);
			},
			create: function(){
				pad.layer.create();
			},
			data: new Array()
		},
		init: function(jqueOverall, jqueLayerContainer){
			// Prepare
			this.DOM.layerContainer = jqueLayerContainer;
			this.DOM.overall = jqueOverall;
		
			// Events
			pThis = this;
			pad.layer.callback.create = function(layer){
				pThis.callback.layer.create(pThis, layer);
			}
			pad.layer.callback.removeAll = function(layer){
				pThis.callback.layer.removeAll(pThis, layer);
			}
			
			// Button
			this.DOM.overall.find('.pane-newlayer').click(function(){
				pThis.layer.create();
			});
		},
		callback: {
			layer: {
				create: function(pThis, layer){
					e = pThis.DOM.layerContainer;
					c = e.find(".example").clone().removeClass('example');
					
					c.find('.name').html(layer.name());
					
					c.find(".preview").click(function(){
						pThis.layer.select(layer.id);
					}).append(layer.DOM.previewPad);
					
					layer.events.nameChange = function(name){
						e.find('.name').html(name);
					}
					
					b = c;
					layer.events.changeToThis = function(layer){
						e.find('.selected').removeClass('selected');
						pThis.layer.data[layer.order()].addClass('selected');
					}
					
					if(pad.layer.index() == layer.order()) c.addClass('selected');
					e.append(c);
					pThis.layer.data[layer.order()] = c;
				},
				removeAll: function(pThis){
					pThis.DOM.layerContainer.find(">*:not(.example)").remove();
				}
			}
		}
	}
	

	/* Pad
	   Require: jQuery
	*/
	var pad = {
		write: function(){
			return this.layer.write;
		},
		setStyle: function(colorRGBAInt, width){
			rgba = new RGBA(colorRGBAInt);
			rgbaCSS = rgba.getCSS();

			alpha = rgba.alpha() / 255;
			this.write().DOM.context.strokeStyle = rgbaCSS;
			this.write().DOM.context.fillStyle = rgbaCSS;
			this.write().DOM.context.lineWidth = width;
			this.layer().DOM.context.globalAlpha = alpha;
			
			style.width = width;
			style.color = rgba;
			
			this.write().opacity(rgba.alpha());
		},
		init: function(jqueLayersContainer, jqueWriteContainer){
			console.groupCollapsed("%c[drawpad.history.replay] Start init state.", "color: darkgreen; font-weight: bold");
			this.layer.root = jqueLayersContainer;
			this.layer.create();
			console.log("%c[drawpad.init] Init Layer Created.", "font-weight: bold; color: darkgreen");
			
			// set Event
			$(document).mousemove(this.mouseEvent.move);
			$(window).mousedown(this.mouseEvent.down);
			$(window).mouseup(this.mouseEvent.up);
			console.log("%c[drawpad.init] Events have been set.", "font-weight: bold; color: darkgreen");

			this.layer.write = new Layer(0, 'drawpad-write', settings.CANVAS_WIDTH, settings.CANVAS_HEIGHT);
			jqueWriteContainer.append(this.write().DOM.$);
			console.log("%c[drawpad.init] Pen layer has been set.", "font-weight: bold; color: darkgreen");
			this.layer.index(0);
			console.groupEnd();
		},
	};
	

	/* Section: Layer */
	var layerContainer = pad.layer = function(i){
		if(i == undefined) i = pad.layer.getLayer();
		if(i.layer); else i = pad.layer.getLayer(i);
		return i;
	}
	// static
	$.extend(layerContainer, {
		indexCount: 0,
		callback: {
			create: function(layer){},
			removeAll: function(){}
		},
		root: false,
		write: false,
		create: function(){
			layer = new Layer(this.indexCount++, 'drawpad', settings.CANVAS_WIDTH, settings.CANVAS_HEIGHT);
			this.root.append(layer.DOM.$);
			
			modes.get('CreateLayer').eventSave();
			this.data.push(layer);
			this.callback.create(layer);
		},
		remove: function(i){
			if(isNan(i)){
				for(k = 0; k < this.data.length; k++)
					if(i === this.data[k]) this.remove(i);
			}else{
				this.data[i].DOM.$.remove();
				this.data.splice(i, 1);
			}
		},
		removeAll: function(){
			$.each(this.data, function(i, o){
				o.DOM.$.remove();
			});
			this.data = [];
			this.resetCount();
			console.log("%c[drawpad.layer.removeAll] All layer was removed.", "font-weight: bold; color: darkorange");
			this.callback.removeAll();
		},
		index: function(i){
			if(i == undefined){
				return this.setting.index;
			}else{
				if(i < 0) return false;
				if(i == this.setting.index) return true;
				this.write.order(i);
				this.setting.index = i;
				console.log("%c[drawpad.layer.index] Layer index changed to [%i].", "font-weight: bold; color: darkorange", i);	

				try{
					style.layer = i;
				}catch(e){
					console.warn("[drawpad.layer.index] Error in style.layer.");
				}
				window.l = this.getLayer().events;
				this.getLayer().events.changeToThis(this.getLayer());
			}
			return true;
		},
		set: function(layer, setting){
			o = this.defines.options;
			l = this(layer);
						
			switch(setting.mode){
				case o.opacity:
					old = l.opacity();
					l.opacity(setting.value);
				break;
				case o.name:
					old = l.name();
					l.name(setting.value);
				break;
			}
			
			modes.ChangeLayerSetting.eventSave(setting);
			history.saveFunction({
				data: {
					oldValue: old,
					newValue: setting.value,
					layer: l,
					dThis: this
				},
				redo: function(){
					this.dThis.set(this.data.layer, this.data.newValue);
				},
				undo: function(){
					this.dThis.set(this.data.layer, this.data.oldValue);				
				}
			});
		},
		clear: function(){
			$.each(this.data, function(i, o){
				o.clear();
			});
		},
		defines: {
			options: {
				opacity: 0,
				name: 1,
				order: 2
			}
		},
		getLayer: function(i){
			if(i === undefined) return this.data[this.setting.index];
			else if(!data[i]) return false;
			else return data[i];
		},
		resetCount: function(){
			this.indexCount = 0;
		},
		setting: {
			index: 0
		},
		data: [],
	});
	/* End Section: Layer */
	
	
	/* Section: Objects 
	   Require: jQuery
	   Contains: Layer
	*/
	var object = pad.object = {};
	

	/* Section: Object - Layer
	   construct
	*/
	var Layer = object.Layer = function(index, className, width, height){
		this.setting = {
			index: index,
			opacity: 255,
			name: 'Layer #' + index,
			width: width,
			height: height
		};
		
		this.DOM = {
			$: false,
			element: false,
			context: false,
			previewPad: false,
			contextPad: false
		};
		
		this.data = {
			onDelete: new Array()
		};

		this.events = {
			nameChange: function(name){},
			changeToThis: function(){}
		};

		// init
		this.id = index;
		
		// init DOM
		canvas = $("<canvas></canvas>").attr({
			'id': className + '_' + this.id,
			'width': width,
			'height': height
		}).addClass(className);
		
		this.DOM.$ = canvas;
		this.DOM.element = canvas[0];
		this.DOM.context = canvas[0].getContext('2d');
		this.DOM.previewPad = $("<canvas></canvas>").attr({
			width: width,
			height: height
		})[0];
		this.DOM.contextPad = this.DOM.previewPad.getContext('2d');
		
		this.order(this.id);
		this.opacity(255);
		console.log("%c[drawpad.object.Layer] " + className + "'s layer was created.", "font-weight: bold; color: orange;");		
	}
	// static
	$.extend(Layer, {
		indexOffset: 10
	});
	// public functions and variables
	object.Layer.prototype = {
		id: -1,
		layer: true,
		setting: false,
		event: false,
		DOM: false,
		clear: function(){
			if(this.DOM.$) this.DOM.context.clearRect(0, 0, this.setting.width, this.setting.height);
			this.clearPreview();
			return this;
		},
		order: function(i){
			if(i == undefined){
				return this.setting.index;
			}else if(i >= 0 && i < 2000){
				this.index = i;
				if(this.DOM.$) this.DOM.$.css('z-index', this.indexOffset + this.index);
			}
			return this;
		},
		opacity: function(o){
			if(o == undefined){
				return this.setting.opacity;
			}else if(o >= 0 && o <= 255){
				this.setting.opacity = o;
				if(this.DOM.$) this.DOM.$.css('opacity', o / 255);
			}else console.error('[drawpad.object.Layer] Opcaity is out of range [0-255][' + o + ']');
			return this;
		},
		name: function(name){
			if(name == undefined){
				return this.setting.name;
			}else{
				this.setting.name = new String(name);
				this.events.nameChange(name);
				// TODO : Change interface
				return this;
			}
		},
		getDataURL: function(){
			return this.DOM.element.getDataURL();
		},
		remove: function(){
			this.DOM.$.remove();
			$(this.DOM.previewPad).remove();
			$.each(e, function(i, o){
				try{
					if(o) o();
				}catch($e){}
			})
		},
		onRemove: function(e){
			this.data.onDelete.push(e);
		},
		clearPreview: function(){
			if(this.DOM.contextPad) this.DOM.contextPad.clearRect(0, 0, this.setting.width, this.setting.height);
		}
	}	
	/* End Section: Object - Layer */

	
	/* Section: Object - RGBA */
	// construct	
	var RGBA = object.RGBA = function(r, g, b, a){
		this.data = {
			value: RGBA.toInt(0, 0, 0, 1)
		};
		if(r && r.rgba){
			this.data.value = r.getInt();
		}else if(r !== undefined && g !== undefined && b !== undefined && a != undefined){
			this.data.value = RGBA.toInt(r, g, b, a);
		}else if(!isNaN(r)){
			this.data.value = r;
		}
	}
	// static
	$.extend(RGBA, {
		toInt: function(r, g, b, a){
			if(r.rgba) return r.color();
			else if(isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return false;
			
			color = r;
			color = (color << 8) + g;
			color = (color << 8) + b;
			color = (color << 8) + a;
			return color;
		},
		toRGBA: function(rgba){
			return new RGBA(rgba);
		},
		toCSS: function(rgba){
			if(!rgba && !rgba.rgba) return false;
			return "rgb(" + rgba.red() + ", " + rgba.green() + ", " + rgba.blue() + ")";
		},
		toCSSFromInt: function(rgbaInt){
			rgba = this.toRGBA(rgbaInt);
			return this.toCSS(rgba);
		}
	});	
	// public function and variables
	RGBA.prototype = {
		rgba: true,
		red: function(i){
			if(i !== undefined && !isNaN(i)){
				if(i >= 0 && i <= 255){
					n = this.data.value & 0x00FFFFFF;
					n = n + (i << 24);
					this.data.value = n;
				}else{
					console.warn("[drawpad.object.RGBA.red] Color is out of bound [0-255][%i]", i);
				}
			}else
				return (this.data.value >> 24) & 0xFF;
		},
		green: function(i){
			if(i !== undefined && !isNaN(i)){
				if(i >= 0 && i <= 255){
					n = this.data.value & 0xFF00FFFF;
					n = n + (i << 16);
					this.data.value = n;
				}else{
					console.warn("[drawpad.object.RGBA.green] Color is out of bound [0-255][%i]", i);
				}
			}else
				return (this.data.value >> 16) & 0xFF;
		},
		blue: function(i){
			if(i !== undefined && !isNaN(i)){
				if(i >= 0 && i <= 255){
					n = this.data.value & 0xFFFF00FF;
					n = n + (i << 8);
					this.data.value = n;
				}else{
					console.warn("[drawpad.object.RGBA.blue] Color is out of bound [0-255][%i]", i);
				}
			}else
				return (this.data.value >> 8) & 0xFF;
		},
		alpha: function(i){
			if(i !== undefined && !isNaN(i)){
				if(i >= 0 && i <= 255){
					n = this.data.value & 0xFFFFFF00;
					n = n + i;
					this.data.value = n;
				}else{
					console.warn("[drawpad.object.RGBA.alpha] Alpha level is out of bound [0-255][%i]", i);
				}
			}else
				return this.data.value & 0xFF;
		},
		getCSS: function(){
			return RGBA.toCSSFromInt(this.data.value);
		},
		getInt: function(){
			return this.data.value;
		}
	}
	/* End Section: Object - RGBA */


	/* Section: Object - Position */
	// construct
	var Position = object.Position = function(x, y){
		this.data = {
			value: 0
		}
		if(x && x.position){
			this.data.value = x.getInt();
		}else if(!isNaN(x) && !isNaN(y)){
			this.data.value = Position.toInt(x, y);			
		}else if(!isNaN(x)){
			this.data.value = x;
		}else if(x.x !== undefined && x.y !== undefined){
			this.data.value = Position.toInt(x.x, x.y);
		}
	}
	// static
	$.extend(Position, {
		offset: 1024,
		toInt: function(x, y){
			if(x && x.position){
				y = x.y();
				x = x.x();
			}else if(x.x !== undefined && x.y !== undefined){
				y = x.x;
				x = x.y;
			}else if(isNaN(x) || isNaN(y)){
				return false;
			}
			pi = (x + this.offset);
			pi = (pi << 12) + (y + this.offset);
			return pi;
		},
		toPosition: function(pi){
			return new Position(pi);
		},
		compare: function(pos1, pos2){
			int1 = new Position(pos1).getInt();
			int2 = new Position(pos2).getInt();
			return int1 == int2;
		}
	});
	// public function and variables
	Position.prototype = {
		position: true,
		data: false,
		x: function(i){
			if(i !== undefined && !isNaN(i)){
				if(i >= -1024 && i <= 1024){
					n = this.data.value & 0x000FFF;
					n = n + ((i + 1024) << 12);
					this.data.value = n;
				}else{
					console.warn("[drawpad.object.Position.x] Position is out of bound [n1024-1024][%i]", i);
				}
			}else
				return ((this.data.value >> 12) & 0xFFF) - 1024;
		},
		y: function(i){
			if(i !== undefined && !isNaN(i)){
				if(i >= -1024 && i <= 1024){
					n = this.data.value & 0xFFF000;
					n = n + (i + 1024);
					this.data.value = n;
				}else{
					console.warn("[drawpad.object.Position.y] Position is out of bound [n1024-1024][%i]", i);
				}
			}else
				return ((this.data.value) & 0xFFF) - 1024;
		},
		getInt: function(){
			return this.data.value;
		},
		compare: function(pos){
			return Position.compare(this, pos);
		}
	}
	/* End Section: Object - Position */


	/* Section: Object - Mode */
	// Creator
	var Mode = object.Mode = function(dat){
		if(!dat) dat = {};
		return $.extend({}, Mode, dat);
	}
	// Static
	$.extend(object.Mode, {
		mode: true,
		name: "NewMode",
		thisIndex: -1,
		eventTrigger: function(){
			console.warn("[drawpad.object.Mode] call undefined eventTrigger!![%s][%0]", str, this);
		},
		eventSave: function(){
			console.warn("[drawpad.object.Mode] call undefined eventSave!![%s][%0]", str, this);
		},
		play: function(){
			console.warn("[drawpad.object.Mode] call undefined play!![%s][%0]", str, this);		
		},
		draw: function(){
			console.warn("[drawpad.object.Mode] call undefined draw!![%s][%0]", str, this);
		},
		data: {}
	})
	/* End Section: Object - Mode */

	
	/* Section: settings */
	var	settings = pad.settings = {
		TIME_DELAY: 20,
		replaySpeed: 1,
		CANVAS_WIDTH: 800,
		CANVAS_HEIGHT: 480,
		CANVAS_EVENTOFFSET: 100,
		HISTORY_LIMIT: 100,
		LAYERPAD_WIDTH: 150,
		SAMEPOINT_LIMIT: 1,
	};
	/* End Section: settings */
		

	/* Section: style */
	var style = pad.style = {
		color: new RGBA(0, 0, 0, 100),
		width: 20,
		draw: 0, // line
		layer: 0,
	};
	/* End Section: style */

	
	/* Section: history */
	var history = pad.history = {
	/* key funciton */
		undo: function (){
			if(historyStep > 0 && (historyPad[historyStep - 1] != undefined || historyStep !== 1)){
				historyObject = historyPad[--historyStep - 1];
				if(historyObject === undefined){
					pad.layer.clear();
					return;
				}
				layer = historyObject.layer;
				pad.layer.change(layer);
				console.log("Undo!!");

				if(data !== undefined){
					pad.lay().clear();
					img = new Image();
					img.src = historyObject.data;
					img.onload = function(){ 
						pad.lay().context.globalAlpha = 1;
						pad.lay().context.drawImage(img, 0, 0) 
					};
				}else{
					historyObject.undo();
				}
			}
		},
		redo: function (){
			if(history.haveRedo()){
				historyObject = historyPad[historyStep++];
				pad.layer.change(historyObject.layer);
				
				if(data !== undefined){
					pad.lay().clear();
					img = new Image();
					img.src = historyObject.data;
					img.onload = function(){ pad.lay().context.drawImage(img, 0, 0) };
				}else{
					historyObject.redo();
				}
			}
		},
		clearRedo: function(){
			historyPad.length = historyStep;
			historyEvent.length = historyStep + 1;
		},
		clearRedoPad: function(){
			historyPad = new Array();
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
		save: function(callback, no_history){
			if(history.haveRedo())
				history.clearRedo();
			
			// Save only settings.HISTORY_LIMIT historys for undo
			if(historyPad.length >= settings.HISTORY_LIMIT){
				historyPad[historyPad.length - settings.HISTORY_LIMIT] = undefined;
				historyMinStep = historyPad.length - settings.HISTORY_LIMIT;
			}
			
			this.data.savingState = true;
			
			canvas = pad.layer().DOM.element.toDataURL("image/jpeg", 0.7);
			pad.layer().DOM.context.drawImage(pad.write().DOM.element, 0, 0);
			pad.layer().clearPreview();
			pad.layer().DOM.contextPad.drawImage(pad.layer().DOM.element, 0, 0);
			layerI = pad.layer.index;
			setTimeout(function(){
				historyPad.push({
					layer: layerI,
					data: canvas
				});
				
			}, 1);
			pad.write().clear();
			if(callback) callback();
		},
		saveFunction: function(layer, oldV, newV, redoFunction, undoFunction){
			if(history.haveRedo())
				history.clearRedo();		

				// Save only settings.HISTORY_LIMIT historys for undo
			if(historyPad.length >= settings.HISTORY_LIMIT){
				historyPad[historyPad.length - settings.HISTORY_LIMIT] = undefined;
				historyMinStep = historyPad.length - settings.HISTORY_LIMIT;
			}
			
			historyPad.push({
				layer: layer,
				oldValue: oldV,
				newValue: newV,
				redo: redoFunction,
				undo: undoFunction
			});
		},
		replay: function(){
			if(history.data.replayState) return false;
			history.data.replayState = true;
			console.groupCollapsed("%c[drawpad.history.replay] Start replay state.", "color: darkgreen; font-weight: bold");
			
			if(history.haveRedo()) history.clearRedo();
			pad.layer.removeAll();
			pad.write().clear();
						
			h = historyEvent;
			historyEvent = new Array();
			
			timeIndex = 0;
			eventIndex = 0;
			endLength = h.length;
			history.clearRedoPad(0);
			recall = {
				call: false
			}
			function timeout(){
				if(recall.call) recall.call = false;
				while(h[eventIndex][modes.define.time] <= Math.floor(timeIndex)){
					if(history.data.drawingState){
						recall.call = timeout;
						return;
					}else{
						console.debug("[drawpad.history.replay] index = [%s], frame = [%s] [%ss:%sms], countPerFrame = [%s], mode = [%s]", 
							("    " + eventIndex).slice(-4),
							("     " + timeIndex).slice(-5), 
							("000" + Math.floor(timeIndex * settings.TIME_DELAY / 1000)).slice(-3), 
							("   " + Math.floor(timeIndex * settings.TIME_DELAY % 1000)).slice(-3), 
							("      " + settings.replaySpeed).slice(-6),
							modes[h[eventIndex][modes.define.drawType]].name
						);
						modes[h[eventIndex][modes.define.drawType]]
							.play(h[eventIndex], function(caller){
								history.data.drawingState = false;
								if(history.data.replayLastState){
									history.data.replayLastState = false;
									history.data.replayState = false;
									
									console.debug("[drawpad.history.replay] index = [%s], frame = [%s] [%ss:%sms], countPerFrame = [%s], mode = [%s]", 
										(" END").slice(-4),
										("     " + timeIndex).slice(-5), 
										("000" + Math.floor(timeIndex * settings.TIME_DELAY / 1000)).slice(-3), 
										("   " + Math.floor(timeIndex * settings.TIME_DELAY % 1000)).slice(-3), 
										("      " + settings.replaySpeed).slice(-6),
										"LAST"
									);
									console.log("%c[drawpad.history.replay] End replay state.", "color: darkgreen; font-weight: bold");
									console.groupEnd();
								}
								if(recall.call) recall.call();
							});
						eventIndex++;
						if(eventIndex >= endLength){
							history.data.replayLastState = true;
							historyEvent = h;
							return true;
						}
					}
				}
				timeIndex += settings.replaySpeed;
				setTimeout(timeout, 1);
			};
			timeout();
		},
		data: {
			replayState: false,
			replayLastState: false,
			savingState: false,
			drawingState: false
		},
		getSize: function(){
			return JSON.stringify(historyEvent).length;
		},
		getMsgPackSize: function(){
			return msgpack.pack(historyEvent).length;
		}
	};
	/* End Section: history */

	
	var dataCheck = function(data){
		return data[modes.define.drawType] === this.thisIndex;
	}
	
	var modes = pad.modes = {}
	$.extend(modes, {
		add: function(index, modeObject){
			if(modeObject && modeObject.mode){
				if(!(this[index] || this[modeObject.name])){
					this[index] = this[modeObject.name] = modeObject;
					console.log("%c[drawpad.modes.add] drawpad.object.Mode named [%s] was added to drawpad.modes[%d], drawpad.modes.%s", "font-weight: bold; color: darkred", modeObject.name, index, modeObject.name);
				}else{
					console.warn("[drawpad.mode.add] index [%d] OR name [%s] was already defined.", index, modeObject.name);
				}
			}else{
				console.warn("[drawpad.modes.add] Invalid parameter type.");
				return false;
			}
		},
		get: function(str){
			if(this.defineMode[str]	=== undefined) return object.Mode();
			return this[this.defineMode[str]];
		},
		defineMode: {
			Line: 0,
			CreateLayer: 1,
			ChangeLayerSetting: 2
		},
		define: {
			drawType: 0,
			width: 1,
			color: 2,
			time: 3,
			axis: 4,
			layer: 5
		}
	});
		
	modes.add(0, Mode({
		name: "Line",
		thisIndex: 0,
		dataCheck: dataCheck,
		play: function(data, callback){
			d = modes.define;
			if(!this.dataCheck(data)) return false;
			if(data[d.axis].length < 2) return true;

			history.data.drawingState = true;
			pad.layer.index(data[d.layer]);
			pad.setStyle(data[d.color], data[d.width]);
			historyEventAxis = data[d.axis];
				
			iNow = 1;
			dataLength = data[d.axis].length;
			dThis = this;
			
			limiter = settings.replaySpeed / settings.TIME_DELAY;

			function time(){
				count = limiter;
				while(count-- > 0){
					cP = new Position(data[d.axis][iNow - 1]);
					cN = new Position(data[d.axis][iNow]);
					dThis.draw(cP, cN);
					iNow++;
					if(iNow >= dataLength - 1){
						history.save(function(){ if(callback) callback(dThis); });
						return;
					}
				}
				setTimeout(function(){ time(); } , settings.TIME_DELAY / settings.replaySpeed);
			}
			setTimeout(function(){ time(); } , settings.TIME_DELAY / settings.replaySpeed);
		},
		draw: function (cStart, cNow){
			if(cStart.compare(cNow)){
				cNow.x(cNow.x() + 1); cNow.y(cNow.y() + 1);
			}
			context = pad.write().DOM.context;
			context.beginPath();
			context.lineJoin = 'round';
			context.lineCap = 'round';
			context.moveTo(cStart.x(), cStart.y());
			context.lineTo(cNow.x() , cNow.y());
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
			this.data.drawState = true;

			pos = new Position(mouse.pos);
			this.data.axis = new Array();
			this.data.axis.push(pos.getInt());
			this.data.lastMouse = pos;
			
			pad.setStyle(style.color, style.width);
			history.timeCount();
		},
		eventAdd: function(){				
			pos = new Position(mouse.pos);
			drawpoint = false;
			if(pos.compare(this.data.lastMouse)){
				this.data.lastSamePoint++;
			}else this.data.lastSamePoint = 0;
			
			if(this.data.lastSamePoint > settings.SAMEPOINT_LIMIT) return false;

			// Add to Pad
			this.draw(this.data.lastMouse, pos);
			
			// Add to historyObject
			this.data.axis.push(pos.getInt());
			
			this.data.lastMouse = pos;
			history.timeCount();
		},
		eventStop: function(e){
			if(this.data.drawState){
				this.data.drawState = false;
			}else return false;
			
			if(e === undefined)
				this.eventAdd();

			this.data.lastSamePoint = 0;
			this.eventSave();
			history.save();
			history.count();
			$("#value_jsize").html((history.getSize() / 1024).toFixed(2) + " KB");
			$("#value_msize").html((history.getMsgPackSize() / 1024).toFixed(2) + " KB");
		},
		eventSave: function(data){
			if(data == undefined){
				data = {};
				d = modes.define;
				data[d.drawType] = this.thisIndex;
				data[d.width]    = style.width;
				data[d.color]    = style.color.getInt();
				data[d.time]     = historyAllStep - this.data.axis.length;
				data[d.axis]     = this.data.axis;
				data[d.layer]    = pad.layer.index();
			}
			historyEvent.push(data);
		},
		data: {
			lastMouse: {x: 0, y: 0},
			axis: false,
			drawState: false,
			lastSamePoint: 0,
			previousDrawpad: false
		},
	}));
	modes.add(1, Mode({
		name: "CreateLayer",
		thisIndex: 1,
		dataCheck: dataCheck,
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
			history.timeCount();
			historyEvent.push(data);
		},
		instantPlay: function(data){
			return this.play(data);
		}
	}));
	modes.add(2, Mode({
		name: "ChangeLayerSetting",
		thisIndex: 2,
		dataCheck: dataCheck,
		play: function(data){
			d = modes.define;
			if(!this.dataCheck(data)) return false;
			if(!isNaN(data[d.axis])){
				pad.layer.set(
					data[d.layer],
					pad.layer.value.getValue(data[d.axis], false)
				);
			}else{
				pad.layer.set(data[d.layer], {
					mode: data[d.axis][0],
					value: data[d.axis][1]
				}, false);
			}
		},
		instantPlay: function(data){
			return this.play(data);
		},
		eventTrigger: function(){},
		eventSave: function(oc){
			o = {};
			o[modes.define.drawType] = mode.defineMode.ChangeLayerSetting;
			o[modes.define.axis] = os;
			o[modes.define.time] = historyAllStep;
			history.timeCount();
			historyEvent.push(o);
		}
	}));

	
	// Event
	var mouseEvent = pad.mouseEvent = {
		down: function (e){
			if(e.which == 1) mouseClicked = true;
		},	
		up: function (e){
			if(e.which == 1) mouseClicked = false;
		},
		move: function (e){
			off = pad.write().DOM.$.offset();
			
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
	

	window.pad = pad;
})(jQuery);