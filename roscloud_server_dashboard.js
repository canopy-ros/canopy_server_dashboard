var redisCollection = new Meteor.RedisCollection("redis");
Containers = new Mongo.Collection("containers");
URLs = new Mongo.Collection("urls");
Messages =  new Mongo.Collection("messages");

Router.configure({
  layoutTemplate: 'main'
});
Router.route('/', {
  template: 'home',
  name: 'home',
  data: function(){
      var currentUser = Meteor.userId();
      return currentUser;
  },
  onBeforeAction: function() {
      var currentUser = Meteor.userId();
      if (currentUser) {
          this.next();
      } else {
          Router.go("login");
      }
  }
});
Router.route("/register", {
  template: 'register',
  name: 'register',
  layoutTemplate: 'outside'
});
Router.route("/login", {
  template: 'login',
  name: 'login',
  layoutTemplate: 'outside'
});
Router.route('/robots', {
    name: 'robots',
    template: 'robots',
    data: function(){
        var currentUser = Meteor.userId();
        return currentUser;
    },
    onBeforeAction: function() {
        var currentUser = Meteor.userId();
        if (currentUser) {
            this.next();
        } else {
            Router.go("login");
        }
    }
});
Router.route('/containers', {
    name: 'containers',
    template: 'containers',
    data: function(){
        var currentUser = Meteor.userId();
        return currentUser;
    },
    onBeforeAction: function() {
        var currentUser = Meteor.userId();
        if (currentUser) {
            this.next();
        } else {
            Router.go("login");
        }
    }
});
Router.route('/containers/:name', {
    name: 'container',
    template: 'container',
    data: function(){
        var currentCont = this.params.name;
        var currentUser = Meteor.userId();
        var res = Containers.findOne({ name: currentCont, user: currentUser });
        if (typeof res === 'undefined')
        	Router.go("containers");
        return res;
    },
    onBeforeAction: function() {
        var currentUser = Meteor.userId();
        if (currentUser) {
            this.next();
        } else {
            Router.go("login");
        }
    }
});
Router.route('/settings', {
    name: 'settings',
    template: 'settings',
    data: function(){
        var currentUser = Meteor.userId();
        return currentUser;
    },
    onBeforeAction: function() {
        var currentUser = Meteor.userId();
        if (currentUser) {
            this.next();
        } else {
            Router.go("login");
        }
    }
});

if (Meteor.isClient) {
	Meteor.subscribe("clients");
	Meteor.subscribe("redis_containers");
	Meteor.subscribe("containers");
	Meteor.subscribe("container_urls");
	Meteor.subscribe("messages");
	var key_prefix = "clients:/" + Meteor.userId() + "/";
	var container_prefix = "containers:" + Meteor.userId() + "_";
	Template.home.helpers({
	  username: function() {
	    return Meteor.user().username;
	  },
	  user_id: function() {
	  	return Meteor.userId();
	  },
	  'containerList': function() {
	    var currentUser = Meteor.userId();
	    return Containers.find({user: currentUser});
    },
    'messageList': function() {
	    var currentUser = Meteor.userId();
    	return Messages.find({user: currentUser}, {sort: {stamp: -1}, limit: 4});
    },
    'formatMessageItem': function(item) {
    	var split = item.split(":");
    	if (split[0] == "container")
    	{
    		return split[1];
    	}
    },
    'messageIcon': function(item) {
    	var split = item.split(":");
    	if (split[0] == "container")
    	{
    		return "cloud";
    	}
    }
	});
  Template.main.events({
    'click .logout': function(event){
      event.preventDefault();
      Meteor.logout();
      Router.go('login');
    }
  });
  Template.main.helpers({
		activeIfTemplateIs: function (template) {
		  var currentRoute = Router.current();
		  return currentRoute &&
		    template === currentRoute.lookupTemplate() ? 'active' : '';
		},
	  username: function() {
	    return Meteor.user().username;
	  },
	  user_id: function() {
	  	return Meteor.userId();
	  }
  });
  Template.main.onRendered(function(){
		$('.ui.dropdown')
		  .dropdown({
		    action: 'hide'
		  });
  });
  Template.home.onRendered(function() {
		$('.message .close')
		  .on('click', function() {
		    $(this)
		      .closest('.message')
		      .transition('fade')
		    ;
		  });
  });
  Template.settings.helpers({
  	username: function() {
  		return Meteor.user().username;
  	},
  	user_id: function() {
  		return Meteor.userId();
  	}
  });
  Template.containers.helpers({
  	'containerList': function() {
	    var currentUser = Meteor.userId();
	    return Containers.find({user: currentUser});
    }
  });
  Template.container.helpers({
  	'urlList': function() {
	    var currentUser = Meteor.userId();
	    return URLs.find({user: currentUser, container: this.name});
    },
    'processList': function() {
    	return JSON.parse(redisCollection.matching(container_prefix + this.name + ":processes").fetch()[0].value);
    },
    'messageList': function() {
	    var currentUser = Meteor.userId();
    	return Messages.find({user: currentUser, item: "container:" + this.name}, {sort: {stamp: -1}, limit: 3});
    },
    'startButtonText': function() {
			if (this.status == 'stopped')
				return "Start Container";
			else if (this.status == 'running')
				return "Stop Container";
    },
    'controlButtonDisabled': function() {
    	if (this.status == 'running')
    		return '';
    	else
    		return 'disabled';
    }
  });
  Template.container.events({
		'submit form': function(event) {
		  event.preventDefault();
		  var url = $('[name="url"]').val();
		  if (url == "")
		  	return;
		  var currentUser = Meteor.userId();
		  URLs.insert({
		      url: url,
		      user: currentUser,
		      container: this.name
		  }, function(error){
    		console.log(error);
			});
		  $('[name="url"]').val('');
		},
		'click .close': function(event){
    	event.preventDefault();
		  var urlID = this._id;
		  URLs.remove({_id: urlID});
		},
		'click .start': function(event){
			event.preventDefault();
			if (this.status == 'running')
			{
				redisCollection.set(container_prefix + this.name + ":status", "stopped");
				Containers.update(this._id, {
	        $set: {status: 'stopped'}
	      });
			  var currentUser = Meteor.userId();
			  Messages.insert({
			      item: "container:" + this.name,
			      user: currentUser,
			      value: 'Container stopped.',
	        	stamp: new Date()
			  }, function(error){
	    		console.log(error);
				});
			}
			else
			{
				redisCollection.set(container_prefix + this.name + ":status", "running");
				Containers.update(this._id, {
	        $set: {status: 'running'}
	      });
			  var currentUser = Meteor.userId();
			  Messages.insert({
			      item: "container:" + this.name,
			      user: currentUser,
			      value: 'Container started.',
	        	stamp: new Date()
			  }, function(error){
	    		console.log(error);
				});
			}
		}
  });
  Template.containers.events({
		'submit form': function(event) {
		  event.preventDefault();
		  var name = $('[name="containerName"]').val().replace(" ", "_");
		  if (name == "")
		  	return;
		  var currentUser = Meteor.userId();
		  Containers.insert({
		      name: name,
		      user: currentUser,
		      status: 'stopped',
        	createdAt: new Date()
		  }, function(error){
    		console.log(error);
			});
			redisCollection.set(container_prefix + name + ":status", "stopped");
			redisCollection.set(container_prefix + name + ":processes", "[]");
		  $('[name="containerName"]').val('');
		},
		'click .deleteContainer': function(event){
    	event.preventDefault();
	    var confirm = window.confirm("Delete this container?");
	    if(confirm){
			  var id = this._id;
			  var doc = URLs.findOne({ container: this.name });
			  if (typeof doc !== 'undefined')
			  	URLs.remove({_id: doc._id});
				redisCollection.del(container_prefix + this.name + ":status");
				redisCollection.del(container_prefix + this.name + ":processes");
			  Containers.remove({_id: id});
	    }
		}
  });
  Template.registerHelper("repoName", function(url) {
  	var split = url.split("/");
  	return split[split.length - 2] + "/" + split[split.length - 1];
  });
  Template.registerHelper("formatDate", function(timestamp) {
  	var monthNames = [
		  "January", "February", "March",
		  "April", "May", "June", "July",
		  "August", "September", "October",
		  "November", "December"
		];
  	var date = new Date(timestamp);
  	var hours = date.getHours();
  	var minutes = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
  	var seconds = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());
  	var day = date.getDate();
		var monthIndex = date.getMonth();
		var year = date.getFullYear();
    return day + ' ' + monthNames[monthIndex] + ' ' + year + ' ' + hours + ':' + minutes + ':' + seconds;
	});
	Template.robots.onRendered(function() {
		var visnodes = Array();
		var visedges = Array();
		var nodeMap = {};
		var robot_nodes = redisCollection.matching(
			key_prefix + "*/receiving:name").fetch();
		for (var i = 0; i < robot_nodes.length; i++)
		{
			var split = robot_nodes[i].key.split(":");
			name = robot_nodes[i].value;
			nodeMap[split[1]] =  name;
			var description = redisCollection.matching(key_prefix + name
          	+ "/receiving:description").fetch();
			visnodes.push({
          id: name,
          label: name,
          mass: 5,
          group: name,
          title: (description.length == 1 ? description[0].value : ""),
      });
			var topic_nodes = redisCollection.matching(
				key_prefix + name + "/*:topic").fetch();
			for (var j = 0; j < topic_nodes.length; j++)
			{
				var topic_split = topic_nodes[j].key.split(":");
				nodeMap[topic_split[1]] = {};
				nodeMap[topic_split[1]]["name"] = topic_nodes[j].value;
				nodeMap[topic_split[1]]["from"] = name;
				if (topic_nodes[j].value.endsWith("/description"))
					continue;
				var type = redisCollection.matching(key_prefix + topic_nodes[j].value.substring(1)
	          	+ ":type").fetch()
				visnodes.push({
	          id: topic_nodes[j].value,
	          label: topic_nodes[j].value,
	          mass: 5,
	          shape: 'box',
	          shapeProperties: {
          		borderRadius: 3
	          },
	          group: name,
	          title: (type.length == 1 ? type[0].value : ""),
	      });
	      var freq = redisCollection.matching(key_prefix + topic_nodes[j].value.substring(1)
	          	+ ":freq").fetch();
	      visedges.push({
            id: name + " " + topic_nodes[j].value,
            from: name,
            to: topic_nodes[j].value,
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 0.8,
                }
            },
            font: {
                align: "top",
            },
            label: (freq.length == 1 ? parseFloat(freq[0].value).toFixed(2) : 0.0) + " Hz",
            group: name,
         });
				var rcv_nodes = redisCollection.matching(key_prefix + topic_nodes[j].value.substring(1)
					+ ":to").fetch();
				if (rcv_nodes.length == 1)
				{
					receivers = rcv_nodes[0].value.split(" ");
					for (var k = 0; k < receivers.length; k++)
					{
						var rcv_freq = redisCollection.matching(key_prefix + receivers[k]
			          	+ "/receiving:freq:" + topic_nodes[j].value).fetch();
			      visedges.push({
		            id: topic_nodes[j].value + " " + receivers[k],
		            from: topic_nodes[j].value,
		            to: receivers[k],
		            arrows: {
		                to: {
		                    enabled: true,
		                    scaleFactor: 0.8,
		                }
		            },
		            font: {
		                align: "top",
		            },
		            color: {
		            	inherit: "to",
		            },
		            label: (rcv_freq.length == 1 ? parseFloat(rcv_freq[0].value).toFixed(2) : 0.0) + " Hz",
		            group: receivers[k],
		         });
					}
				}
			}
		}
		console.log(visedges);
		console.log(visnodes);
		var nodes = new vis.DataSet(visnodes);

		var edges = new vis.DataSet(visedges);

		var container = document.getElementById('graph');

		var data = {
			nodes: nodes,
			edges: edges
		};
		var options = {};

		var network = new vis.Network(container, data, options);

		redisCollection.matching(
			key_prefix + "*/receiving:name").observe({
				added: function(item) {
					var split = item._id.split(":");
					name = item.value;
					nodeMap[split[1]] = name;
					var description = redisCollection.matching(key_prefix + name
		          	+ "/receiving:description").fetch();
					nodes.add({
		          id: name,
		          label: name,
		          mass: 5,
		          group: name,
		          title: (description.length == 1 ? description[0].value : ""),
		      });
				},
				removed: function(item) {
					var split = item._id.split(":");
					name = item.value;
					delete nodeMap[split[1]];
					nodes.remove({id: name});
				}
			});
		redisCollection.matching(
				key_prefix + "*:topic").observe({
					added: function(item) {
						if (item.value.endsWith("/description"))
							return;
						var split = item._id.split(":");
						var name = item.value.split("/")[1];
						nodeMap[split[1]] = {};
						nodeMap[split[1]]["name"] = item.value;
						nodeMap[split[1]]["from"] = name;
						var type = redisCollection.matching(key_prefix + item.value.substring(1)
			        + ":type").fetch();
						nodes.add({
			          id: item.value,
			          label: item.value,
			          mass: 5,
			          shape: 'box',
			          shapeProperties: {
		          		borderRadius: 3
			          },
			          group: name,
			          title: (type.length == 1 ? type[0].value : ""),
			      });
			      var freq = redisCollection.matching(key_prefix + item.value.substring(1)
			        + ":freq").fetch();
			      edges.add({
		            id: name + " " + item.value,
		            from: name,
		            to: item.value,
		            arrows: {
		                to: {
		                    enabled: true,
		                    scaleFactor: 0.8,
		                }
		            },
		            font: {
		                align: "top",
		            },
		            label: (freq.length == 1 ? parseFloat(freq[0].value).toFixed(2) : 0.0) + " Hz",
		            group: name,
		         });
		    	},
		    	removed: function(item) {
						var split = item._id.split(":");
						nodes.remove({id: item.value});
						edges.remove({id: nodeMap[split[1]]["from"] + " " + item.value});
		    	}
		   });
		redisCollection.matching(
			key_prefix + "*/receiving:description").observe({
				added: function(item) {
					var split = item._id.split(":");
					if (typeof nodeMap[split[1]] === 'undefined') {
				    return;
					}
					if (nodes.get(nodeMap[split[1]]) == null)
						return;
					nodes.update({id: nodeMap[split[1]],
						title: item.value});
				}
			});
		redisCollection.matching(
			key_prefix + "*:type").observe({
				added: function(item) {
					var split = item._id.split(":");
					if (typeof nodeMap[split[1]] === 'undefined') {
				    return;
					}
					if (nodes.get(nodeMap[split[1]]["name"]) == null)
						return;
					nodes.update({id: nodeMap[split[1]]["name"],
						title: item.value});
				}
			});
		redisCollection.matching(
			key_prefix + "*/receiving:freq:*").observe({
				added: function(item) {
					var split = item._id.split(":");
					if (typeof nodeMap[split[1]] === 'undefined'){
				    return;
					};
					if (split[3].endsWith("/description"))
						return;
					if (edges.get(split[3] + " " + nodeMap[split[1]]) == null)
						return;
					edges.update({id: split[3] + " " + nodeMap[split[1]],
						label: parseFloat(item.value).toFixed(2) + " Hz"});
				},
				changed: function(item, oldItem) {
					var split = item._id.split(":");
					edges.update({id: split[3] + " " + nodeMap[split[1]],
						label: parseFloat(item.value).toFixed(2) + " Hz"});
				}
			});
		redisCollection.matching(
			key_prefix + "*:freq").observe({
				added: function(item) {
					var split = item._id.split(":");
					if (typeof nodeMap[split[1]] === 'undefined'){
				    return;
					};
					if (nodeMap[split[1]]["name"].endsWith("/description"))
						return;
					if (edges.get(nodeMap[split[1]]["from"] + " "
						+ nodeMap[split[1]]["name"]) == null)
						return;
					edges.update({id: nodeMap[split[1]]["from"] + " "
						+ nodeMap[split[1]]["name"], label: parseFloat(
							item.value).toFixed(2) + " Hz"});
				},
				changed: function(item, oldItem) {
					var split = item._id.split(":");
					if (typeof nodeMap[split[1]] === 'undefined'){
				    return;
					};
					if (nodeMap[split[1]]["name"].endsWith("/description"))
						return;
					edges.update({id: nodeMap[split[1]]["from"] + " "
						+ nodeMap[split[1]]["name"], label: parseFloat(
							item.value).toFixed(2) + " Hz"});
				}
			});
		redisCollection.matching(
			key_prefix + "*:to").observe({
				added: function(item) {
					var split = item._id.split(":");
					if (typeof nodeMap[split[1]] === 'undefined'){
				    nodeMap[split[1]] = {};
				    nodeMap[split[1]]["name"] = split[1].substring(split[1].substring(1).indexOf("/") + 1);
					};
					if (nodeMap[split[1]]["name"].endsWith("/description"))
						return;
					var to_split = item.value.split(" ");
					for (var i = 0; i < to_split.length; i++)
					{
						var rcv_freq = redisCollection.matching(key_prefix + to_split[i]
		          	+ "/receiving:freq:" + nodeMap[split[1]]["name"]).fetch();
						edges.add({
	            id: nodeMap[split[1]]["name"] + " " + to_split[i],
	            from: nodeMap[split[1]]["name"],
	            to: to_split[i],
	            arrows: {
	                to: {
	                    enabled: true,
	                    scaleFactor: 0.8,
	                }
	            },
	            font: {
	                align: "top",
	            },
	            color: {
	            	inherit: "to",
	            },
	            label: (rcv_freq.length == 1 ? parseFloat(rcv_freq[0].value).toFixed(2) : 0.0) + " Hz",
	            group: to_split[i],
	         });
					}
				},
				changed: function(item, oldItem) {
					var split = item._id.split(":");
					if (typeof nodeMap[split[1]] === 'undefined'){
				    nodeMap[split[1]] = {};
				    nodeMap[split[1]]["name"] = split[1].substring(split[1].substring(1).indexOf("/") + 1);
					};
					var to_split = item.value.split(" ");
					var removeEdges = new Array();
					edges.forEach((function(edge) {
						if (!edge.id.startsWith(nodeMap[split[1]]["name"]))
							return;
						var exists = false;
						for (var i = 0; i < to_split.length; i++)
						{
							if (nodeMap[split[1]]["name"] + " " + to_split[i] == edge.id)
								exists = true;
						}
						if (!exists)
							removeEdges.push(edge);
						}));
					edges.remove(removeEdges);
					var addEdges = new Array();
					for (var i = 0; i < to_split.length; i++)
					{
						var exists = false;
						edges.forEach((function(edge) {
							if (edge.id == nodeMap[split[1]]["name"] + " " + to_split[i])
							{
								exists = true;
							}
						}));
						if (!exists)
						{
							var rcv_freq = redisCollection.matching(key_prefix + to_split[i]
			          	+ "/receiving:freq:" + nodeMap[split[1]]["name"]).fetch();
							addEdges.push({
		            id: nodeMap[split[1]]["name"] + " " + to_split[i],
		            from: nodeMap[split[1]]["name"],
		            to: to_split[i],
		            arrows: {
		                to: {
		                    enabled: true,
		                    scaleFactor: 0.8,
		                }
		            },
		            font: {
		                align: "top",
		            },
		            color: {
		            	inherit: "to",
		            },
		            label: (rcv_freq.length == 1 ? parseFloat(rcv_freq[0].value).toFixed(2) : 0.0) + " Hz",
		            group: to_split[i],
		         });
						}
					}
					edges.add(addEdges);
				},
				removed: function(item) {
					var split = item._id.split(":");
					var to_split = item.value.split(" ");
					for (var i = 0; i < to_split.length; i++)
					{
						edges.remove({id: nodeMap[split[1]]["name"] + " " + to_split[i]});
					}
				}
			});
	});
  Template.login.onRendered(function() {
    var validator = $('.login').validate({
        submitHandler: function(event) {
          var group = $('[name=group]').val();
          var password = $('[name=password]').val();
          Meteor.loginWithPassword(group, password, function(error) {
            if (error) {
              if (error.reason == "User not found") {
                  validator.showErrors({
                      email: "That email doesn't belong to a registered user."   
                  });
              }
              if (error.reason == "Incorrect password") {
                  validator.showErrors({
                      password: "You entered an incorrect password."    
                  });
              }
            } else {
              var currentRoute = Router.current().route.getName();
              if(currentRoute == "login"){
                  Router.go("home");
              }
            }
          });
        }
      });
    });
  Template.register.onRendered(function(){
    var validator = $('.register').validate({
        submitHandler: function(event) {
          var group = $('[name=group]').val();
          var email = $('[name=email]').val();
          var password = $('[name=password]').val();
          Accounts.createUser({
              username: group,
              email: email,
              password: password,
          }, function(error) {
              if (error) {
                if (error.reason == "Email already exists.") {
                    validator.showErrors({
                        email: "That email already belongs to a registered user."   
                    });
                }
              } else {
                  Router.go("home"); // Redirect user if registration succeeds
              }
            });
        }
      });
    });
  $.validator.setDefaults({
      rules: {
          email: {
              required: true,
              email: true
          },
          password: {
              required: true,
              minlength: 6
          }
      },
      messages: {
          email: {
              required: "You must enter an email address.",
              email: "You've entered an invalid email address."
          },
          password: {
              required: "You must enter a password.",
              minlength: "Your password must be at least {0} characters."
          }
      }
  });
  Template.register.events({
      'submit form': function(event) {
          event.preventDefault();
      }
  });
  Template.login.events({
    'submit form': function(event) {
      event.preventDefault();
    }
  });
}

if (Meteor.isServer) {
	Containers._ensureIndex({name: 1, user: 1}, {unique: 1});
	Meteor.publish("clients", function () {
		console.log(this.userId);
	  return redisCollection.matching("clients:/" + this.userId + "/*");
	});
	Meteor.publish("redis_containers", function () {
		console.log(this.userId);
	  return redisCollection.matching("containers:" + this.userId + "_*:*");
	});
	Meteor.publish("containers", function() {
	  return Containers.find({user: this.userId});
	});
	Meteor.publish("container_urls", function() {
	  return URLs.find({user: this.userId});
	});
	Meteor.publish("messages", function() {
	  return Messages.find({user: this.userId});
	});
}
