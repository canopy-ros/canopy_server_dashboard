var redisCollection = new Meteor.RedisCollection("redis");
Router.route('/', {
  template: 'home',
  name: 'home'
});
Router.route("/register")
Router.route("/login");
Router.route('/robotgraph', {
    name: 'robotgraph',
    template: 'robotgraph',
    data: function(){
        var currentUser = Meteor.userId();
        return currentUser;
    },
    onBeforeAction: function() {
        var currentUser = Meteor.userId();
        if (currentUser) {
            this.next();
        } else {
            this.render("login");
        }
    }
});
Router.route('/cloudmanager', {
    name: 'cloudmanager',
    template: 'cloudmanager',
    data: function(){
        var currentUser = Meteor.userId();
        return currentUser;
    },
    onBeforeAction: function() {
        var currentUser = Meteor.userId();
        if (currentUser) {
            this.next();
        } else {
            this.render("login");
        }
    }
});

if (Meteor.isClient) {
	Meteor.subscribe("clients");
	Template.home.helpers({
	  username: function() {
	    return Meteor.user().username;
	  }
	});
	Template.robotgraph.onRendered(function() {
			var nodes = new vis.DataSet(
		);

		var edges = new vis.DataSet(
		);

		var container = document.getElementById('graph');

		var data = {
			nodes: nodes,
			edges: edges
		};
		var options = {};

		var network = new vis.Network(container, data, options);
		function updateEdges() {
		console.log(redisCollection.matching("clients:/MIICXAIBAAKBgQCTUQ49FJUCVvU5tIag/*").fetch());
			$.ajax({
				url: 'http://localhost:50000/graph/MIICXAIBAAKBgQCTUQ49FJUCVvU5tIag/updateedges',
				dataType: 'json',
				success: function(data) {
					for (var i = 0; i < data.data.length; i++)
					{
						var exists = false;
						edges.forEach((function(edge) {
							if (edge.id == data.data[i].id)
							{
								exists = true;
							}
						}));
						if (exists)
							edges.update({id: data.data[i].id, label: data.data[i].label});
					}
				},
				complete: function() {
					setTimeout(updateEdges, 1000);
				}
			});
		}
		function update() {
			$.ajax({
				url: 'http://localhost:50000/graph/MIICXAIBAAKBgQCTUQ49FJUCVvU5tIag/update',
				dataType: 'json',
				success: function(data) {
					var removeNodes = new Array();
					nodes.forEach((function(node) {
						var exists = false;
						for (var i = 0; i < data.nodes.length; i++)
						{
							if (data.nodes[i].id == node.id)
								exists = true;
						}
						if (!exists)
							removeNodes.push(node);
						}));
					nodes.remove(removeNodes);
					var addNodes = new Array();
					for (var i = 0; i < data.nodes.length; i++)
					{
						var exists = false;
						nodes.forEach((function(node) {
							if (node.id == data.nodes[i].id)
								exists = true;
						}));
						if (!exists)
							addNodes.push(data.nodes[i]);
					}
					nodes.add(addNodes);
					var removeEdges = new Array();
					edges.forEach((function(edge) {
						var exists = false;
						for (var i = 0; i < data.edges.length; i++)
						{
							if (data.edges[i].id == edge.id)
								exists = true;
						}
						if (!exists)
							removeEdges.push(edge);
						}));
					edges.remove(removeEdges);
					var addEdges = new Array();
					for (var i = 0; i < data.edges.length; i++)
					{
						var exists = false;
						edges.forEach((function(edge) {
							if (edge.id == data.edges[i].id)
	{
								exists = true;
	}
						}));
						if (!exists)
						{
							addEdges.push(data.edges[i]);
						}
					}
					edges.add(addEdges);
				},
				complete: function() {
					setTimeout(update, 5000);
				}
			});
		}
		setTimeout(updateEdges, 1000);
		setTimeout(update, 5000);
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
  Template.navigation.events({
    'click .logout': function(event){
      event.preventDefault();
      Meteor.logout();
      Router.go('login');
    }
  });
}

if (Meteor.isServer) {
	Meteor.publish("clients", function () {
		console.log(this.userId);
	  return redisCollection.matching("clients:/MIICXAIBAAKBgQCTUQ49FJUCVvU5tIag/*");
	});
}
