/* global excelUpload, angular */

//Controller for home
excelUpload.controller('HomeController',function($scope,$http) {
	
	$scope.manageTemplateAction =  function(){
		window.location.assign("#manage-templates");
	};
	
	$scope.dataImportAction =  function(){
		window.location.assign("#data-import");
	};
	
	$scope.logsAction =  function(){
		window.location.assign("#logs");
	};

	$scope.settingAction =  function(){
		window.location.assign("#settings");
	};

	$scope.facilitywiseAction =  function(){
		window.location.assign("#facilitywise");
	};

	$scope.userCredentials = [];
	$scope.superUserAccessAuthority = 'NO';
	$scope.userName = '';
	$scope.userRoleName = '';
	//http://127.0.0.1:8090/uphmis/api/me.json?fields=userCredentials[userRoles[id,name,authorities]]&paging=false



	//http://127.0.0.1:8090/uphmis/api/me.json?fields=id,displayName,userCredentials[username,userRoles[id,displayName,programs,authorities]]&skipPaging=true
	$http.get('../../../api/me.json?fields=id,displayName,userCredentials[username,userRoles[id,displayName,programs,authorities]]&skipPaging=true')
			.then(function(responseUser) {
				$scope.userName = responseUser.data.userCredentials.username;

				for (var j = 0; j < responseUser.data.userCredentials.userRoles.length; j++) {

					$scope.userRoleName = responseUser.data.userCredentials.userRoles[j].displayName;

					for (var k = 0; k < responseUser.data.userCredentials.userRoles[j].authorities.length; k++) {

						if( responseUser.data.userCredentials.userRoles[j].displayName === 'Superuser'
								|| responseUser.data.userCredentials.userRoles[j].authorities[k] === 'ALL'){

							$scope.superUserAccessAuthority = 'YES';
							return;
						}
					}
				}
			});

	console.log( $scope.userRoleName + " -- " + $scope.superUserAccessAuthority  );
});