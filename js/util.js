function getView(sType){
    var views = chrome.extension.getViews();
    for (var i = 0; i < views.length; i++) {
        var view = views[i];
        if (view.viewName && view.viewName == sType) {
            return view;
        }
    }
    return null;
}
if(typeof renjian == "undefined") renjian = {userName: "asfman", password: "rjzd10cs"};
renjian.util = {
	getTimelineName: {
		friendsTimeline: "动态",
		mentionsTimeline: "@我",
		publicTimeline: "串门"
	},
	getTimeline: function(curType, force){
		try{
			curType = curType || "friendsTimeline";
			if(!renjian.api[curType]) return false;
			renjian.trace("读取" + renjian.util.getTimelineName[curType]);
			$("#loading").html("读取" +  renjian.util.getTimelineName[curType]).show();
			renjian.trace("读取url:" + renjian.api[curType]);
			renjian.curType = curType;
			renjian.util.clearTimer();
			if(renjian.xhr) renjian.xhr.abort();
			if(!force && renjian.appData[curType] && renjian.appData[curType].data.length){
				createHtml(curType);
				return false;
			}
			renjian.xhr = $.ajax({
				url: renjian.api[curType], 
				dataType: "json",
				username: renjian.userName,
				password: renjian.password,
				success: function(arr){
						arr = arr || [];
						if(!arr.length) return false;
						renjian.appData[curType] = {data: arr};
						renjian.trace("解析" + curType + ", 共" + arr.length + "条");
						createHtml(curType);
					}
				});
				function createHtml(curType){
						var arr =  renjian.appData[curType].data;
						if(arr && arr.length){
							var ret = ["<ul id='" + curType + "List'>"];
							ret.push($.map(arr, function(status,	idx){
								if(idx == 0) renjian.appData[curType].lastId = status.id;
								return renjian.util.parseData(status);
							}).join(""));
							ret.push("</ul>");
							$("#loading").html("读取完成").fadeOut(3000);
							$("#scrollArea").empty().html(ret.join(""));
							renjian.trace("读取" + renjian.util.getTimelineName[curType] +"end");
							/*
							renjian.trace("开启定时器读取" + renjian.curType);
							renjian.timer.friendsTimeline = setInterval(function(){
								renjian.util.getData();
							}, renjian.interval);
							*/
						}				
				}
		}catch(e){
			renjian.trace("error:" + e.message);
		}
		return false;
	},
	getData: function(){
			renjian.trace("读取" + renjian.util.getTimelineName[renjian.curType] + "动态");
			renjian.trace("sinceId:" + renjian.appData[renjian.curType].lastId);
			try{
					if(renjian.xhr) renjian.xhr.abort();
					renjian.xhr = $.ajax({
							url: renjian.api[renjian.curType], 
							data: {since_id : renjian.appData[renjian.curType].lastId},
							dataType: "json",
							username: renjian.userName,
							password: renjian.password,
							success: function(arr, status, xhr){
											arr = arr || [], curType = renjian.curType;
											var serverTime  = new Date(xhr.getResponseHeader("Date")).valueOf();
											$("#" + curType + "List .time").each(function(){
												$(this).html(renjian.util.calRelTime($(this).attr("rel"), serverTime));
											});
											if(!arr.length){
												renjian.trace("没有新内容");
												return false;
											}
											renjian.trace("有新内容，长度为：" + arr.length);
											renjian.trace("合并数据");
											Array.prototype.unshift.apply(renjian.appData[curType].data, arr);
											if(arr.length > 1) arr = arr.reverse();
											renjian.appData[curType].lastId = arr[0].id;
											renjian.trace("push新内容");
											var ct = $("#" + curType + "List");
											$.each(arr, function(idx, status){
												$(renjian.util.parseData(status)).hide().prependTo(ct).slideDown();
											});
								},
								complete: function(){
									renjian.trace("读取" + renjian.util.getTimelineName[curType] + "end");
								}
					});
			}catch(e){
				renjian.trace("error:" + e.message);
			}
	},
	parseData: function(status){
			var tplObj = {
				text: renjian.util.fixText(status.text, 140),
				time: status.relative_date,
				screenName: status.user.screen_name,
				avatar: status.user.profile_image_url.replace(/120x120/, "48x48"),
				createdAt: renjian.util.paseTime(status.created_at)
			};
			var sTpl = renjian.statusTplText;
			if(status.status_type == "LINK"){
				tplObj.linkTitle = status.link_title;
				tplObj.linkUrl = status.original_url;
				sTpl = renjian.statusTplLink;
			}else if(status.status_type == "PICTURE"){
				tplObj.picture = status.thumbnail;
				sTpl = renjian.statusTplPicture;
			}
			return  renjian.util.template(sTpl, tplObj);	
	},
	clearTimer: function (){
		$.each(renjian.timer, function(key, val){
			if(val) clearInterval(val);
		});
	},
	template: function(str, data){
		for(var _prop in data){
			str = str.replace(new RegExp("@{" + _prop + "}", "g"), data[_prop]);
		}
		return str.replace(/@{\w+?}/g, "");
	},
	fixText: function(source, length){
		if(charCount(source) > length)
		{
			while(charCount(source) > length - 3)
			{
				source = source.slice(0, -1);
			}
			while(charCount(source) < length) source += ".";
		}
		function charCount(text)
		{
		   return text.replace(/[^\x00-\xff]/g,"11").length;
		}
		return source;
	},
	calRelTime: function(sTime, eTime){
		if(!sTime||!eTime) return false;
		var interval = eTime - sTime;
		var subDate = Math.floor(interval/(60 * 60 * 24 * 1000));
		if (interval < 0) interval = 0;
		var second = Math.floor(interval / 1000);
		if (second < 60) return (second?second:1)  + "秒前";
		else if (second < 60 * 60) return Math.floor(second / 60) + "分钟前";
		else if (second < 60 * 60 * 24) return Math.floor(second / 60 / 60) + "小时前";
		else if (second < 60 * 60 * 24 * 2 && subDate == 1) return "昨天";
		else if (second < 60 * 60 * 24 * 3 && subDate == 2) return "前天";
		else if (second < 60 * 60 * 24 * 30) return subDate + "天前";
		else if (second < 60 * 60 * 24 * 365) return Math.floor(second / (60 * 60 * 24 * 30)) + "月前";
		else if (second < 60 * 60 * 24 * 365 * 2) return "去年";
		else if (second < 60 * 60 * 24 * 365 * 3) return "前年";
		else return Math.floor(second / 60 / 60 / 24 / 365) + "年前";	
	},
	paseTime: function(s){
		//2010-07-09 15:22:42 +0800
		var arr = s.split(/\s+/);
		var ymd = arr[0].split("-"), hms = arr[1].split(":");
		return new Date(ymd[0], parseInt(ymd[1],10) - 1, ymd[2], hms[0], hms[1], hms[2]).valueOf();
	},
	getServerTime: function(){
		var serverTime = null;
		var xhr = new XMLHttpRequest();
		xhr.open("HEAD", "http://renjian.com", false);
		xhr.onload = function(){
			serverTime  = new Date(xhr.getResponseHeader("Date")).valueOf();
		}
		xhr.send();
		return serverTime;
	}
};