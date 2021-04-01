/* global excelUpload, angular */

$.ajaxSetup({
    async: false
});
var favorites = [];
var length1;
var length2;
var length3;
var count = 0;

//Controller for excel importing
excelUpload.controller('ImportFacilitywiseController',
    function ($rootScope,
        $scope,
        $timeout,
        $route,
        $filter,
        ExcelMappingService,
        ValidationRuleService,
        CurrentSelection,
        ExcelReaderService,
        MetaDataFactory,
        orderByFilter,
        OrgUnitService,
        DialogService) {

        $scope.orgUnitGroups = {};
        $scope.dataSets = {};
        $scope.templates = {};
        // orgUnitMapping is not used for new requirement			$scope.orgUnitMapping = {};
        $scope.history = {};

        var dataElementValueTypeMap = [];
        var dataElementNameMap = [];

        //loadDataElements();
        var cdsr = { completeDataSetRegistrations: [] };

        //data cells - this was put inside validateAll()
        // $scope.dataCells = [];

        $scope.engAddress = ["", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

        $scope.confirmedUploads = [];

        $scope.dataEndingCell = 0;

		/* **************************************************************************************
		 **** RETRIEVING ROOT JSON AND NEEDED DATA ***********************************************
		 ************************************************************************************* **/

        //templates
        $("#templateProgress").html("Retrieving all the saved templates...");
        ExcelMappingService.get('Excel-import-app-templates').then(function (tem) {
            if (!jQuery.isEmptyObject(tem))
                $scope.templates = tem;
            else
                $scope.templates = { templates: [] };

            console.log($scope.templates);

            //templates
            $("#templateProgress").html("Retrieving all the organisation units mapping data...");
            ExcelMappingService.get('Excel-import-app-orgunit-mapping').then(function (oum) {

				/* orgUnitMapping is not used for new requirement
				 if(!jQuery.isEmptyObject(oum))
				 $scope.orgUnitMapping = oum;
				 else
				 $scope.orgUnitMapping = { omaping : [] };
				 console.log( $scope.orgUnitMapping );
				 */

                //history
                $("#templateProgress").html("Retrieving all the import history...");
                ExcelMappingService.get('Excel-import-app-history').then(function (his) {
                    $scope.history = jQuery.isEmptyObject(his) ? JSON.parse('{"history" : []}') : his;
                    console.log(his);

                    //org unit group
                    $("#templateProgress").html("Fetching organisation unit groups...");
                    $.get('../../../api/organisationUnitGroups.json?paging=false', function (ou) {
                        console.log(ou);
                        $scope.orgUnitGroups = ou.organisationUnitGroups;

                       
                        //datasets whith attributevalues="Excel_Import_DataSet_Filter"
                         $("#templateProgress").html("Fetching all the data sets...");
                         var datets =[];
			$.get('../../../api/dataSets.json?fields=id,name,attributeValues[value,attribute[id,name,code]]&paging=false', function(ds){
				 for(var j=0;j<ds.dataSets.length;j++)
                           {var val=ds.dataSets[j].attributeValues.length;
                                for (var i=0;i<val;i++)
								{  var val1=ds.dataSets[j].attributeValues[i].attribute.code;
									if( ds.dataSets[j].attributeValues.length!=0)
									{
									if (ds.dataSets[j].attributeValues[i].attribute.code == 'Excel_Import_DataSet_Filter' && ds.dataSets[j].attributeValues[i].value == "true")
									{
										datets.push(ds.dataSets[j]);
										
                                    }
                                }
							}
						}
							var test=datets;
                            $scope.dataSets = datets;
                            
                            

                            //dataelements
                            $("#templateProgress").html("Fetching all the data elements...");
                            $.get('../../../api/dataElements.json?fields=id,name,shortName,valueType,categoryCombo[categoryOptionCombos[id,name]]&paging=false', function (ds) {
                                console.log(ds);
                                $scope.dataElements = ds.dataElements;

                                for (var i = 0; i < $scope.dataElements.length; i++) {

                                    dataElementValueTypeMap[$scope.dataElements[i].id] = $scope.dataElements[i].valueType;
                                    dataElementNameMap[$scope.dataElements[i].id] = $scope.dataElements[i].name;
                                }

                                console.log( dataElementValueTypeMap);
                                console.log( dataElementNameMap);
								/* is service is not used for new requirement, orgUnits are load using orgUnitTree
								 //orgunits
								 $("#templateProgress").html("Fetching all the organisation units...");
								 $.get('../api/organisationUnits.json?paging=false', function(ds){
								 console.log( ds );
								 $scope.organisationUnits = ds.organisationUnits;
								 }).
								 fail(function(jqXHR, textStatus, errorThrown){
								 $("#templateProgress").html("Failed to fetch organisation units ( " + errorThrown + " )");
								 });
								 */

                                $scope.generateEnglishAddresses();
                                $scope.startBuilding();
                                $("#loader").hide();

                            }).
                                fail(function (jqXHR, textStatus, errorThrown) {
                                    $("#templateProgress").html("Failed to fetch data elements ( " + errorThrown + " )");
                                });
                        }).
                            fail(function (jqXHR, textStatus, errorThrown) {
                                $("#templateProgress").html("Failed to fetch data sets ( " + errorThrown + " )");
                            });

                    }).
                        fail(function (jqXHR, textStatus, errorThrown) {
                            $("#templateProgress").html("Failed to fetch organisation unit groups ( " + errorThrown + " )");
                        });
                });
            });
        });
        //**************************************************************************************************************

        //building UIs
        $scope.startBuilding = function () {
            $("#templateProgress").html("Making things ready...");
            $.each($scope.dataSets, function (i, d) {
                //$("#imDataSetId").append("<option value='"+ d.id +"' > " + d.name +" </option>");
                $("#imDataSetId").append("<option value='" + d.id + "' > " + d.name + " </option>");
            });

            $.each($scope.orgUnitGroups, function (i, o) {
                //$("#imOrgUnitGrp").append("<option value='"+ o.id +"' > " + o.name +" </option>");
                $("#imOrgUnitGrp").append("<option value='" + o.id + "' > " + o.displayName + " </option>");
            });
        };

        //**************************************************************************************************************

        $scope.generatePeriods = function () {

            if ($("#imDataSetId").val() != "") {
                var url = "../../../api/dataSets/" + $("#imDataSetId").val() + ".json?fields=periodType";
                $.get(url, function (d) {

                    //printing periods ------------------
                    var periodType = d.periodType;
                    var today = new Date();
                    //var stDate = "01/01/" + today.getFullYear();
                    var stDate = "01/01/" + "2014";
                    var endDate = "01/01/" + (today.getFullYear() + 1);

                    var periods = "";

                    if (periodType == "Daily")
                        periods = daily(stDate, endDate);
                    else if (periodType == "Weekly")
                        periods = weekly(stDate, endDate);
                    else if (periodType == "Monthly")
                        periods = monthly(stDate, endDate);
                    else if (periodType == "Yearly")
                        periods = yearly(stDate, endDate);
                    else if (periodType == "Quarterly")
                        periods = quartly(stDate, endDate);

                    $("#importPeriod").html("");
                    periods.split(";").forEach(function (p) {
                        var ps = periodType == 'Monthly' ? $scope.monthString(p) : p;
                        var h = "<option value='" + p + "'>" + ps + "</option>";
                        $("#importPeriod").append(h);
                    });

                    //prining templates ---------------------
                    var noTemplatesFound = true;
                    $('#importTemp').html("");
                    $scope.templates.templates.forEach(function (te) {
                        if (te.dataSet == $("#imDataSetId").val() && (te.orgUnitGroup == $("#imOrgUnitGrp").val() || $("#imOrgUnitGrp").val() == "all")) {
                            noTemplatesFound = false;
                            $('#importTemp').append($('<option>', {
                                value: te.id,
                                text: te.name
                            }));
                        }
                    });

                    if (noTemplatesFound) {
                        $('#importTemp').append($('<option>', {
                            value: -1,
                            text: "No templates found. Add one."
                        }));

                        $("#templatesDiv").removeClass("disabled");
                        $("#templatesDiv").addClass("disabled");
                    }
                    else {
                        $("#templatesDiv").removeClass("disabled");
                    }
                });

            }
        };



        //----------------------------------------------------------------------------------------------
        // $scope.filterOrgUnits = function () {

        //     var orgUnitGroupID = $("#imOrgUnitGrp").val();
        //     var parentUnitID = $scope.selectedOrgUnit.id;
        //     // var parentvalues = [];
        //     // var parentnames = [];
        //     // var url = "../api/organisationUnits.json?paging=false&fields=id,name&filter=parent.id:eq:"+parentUnitID;
        //     // $.get(url, function(ous){
        //     //     length1 = ous.organisationUnits.length;
        //     //     for(var i = 0 ;i<length1; i++)
        //     //     {
        //     //         parentvalues[i] = ous.organisationUnits[i].id;
        //     //         parentnames[i] = ous.organisationUnits[i].name;
        //     //     }
        //     //     return length1,parentvalues,parentnames;
        //     // });
        //     var parentvalues1 = [];
        //     var parentnames1 = [];
        //     var url1 = "../../../api/organisationUnits.json?paging=false&fields=id,name&filter=parent.id:eq:" + parentUnitID + "&filter=organisationUnitGroups.id:eq:" + orgUnitGroupID;
        //     $.get(url1, function (ous1) {
        //         length2 = ous1.organisationUnits.length;
        //         if (length2 > 0) {
        //             for (var j = 0; j < length2; j++) {
        //                 parentvalues1[j] = ous1.organisationUnits[j].id;
        //                 parentnames1[j] = ous1.organisationUnits[j].name;
        //             }
        //             return length2, parentvalues1, parentnames1;
        //         }
        //     });
        //     // for(var a = 0; a < length1; a++)
        //     // {
        //     for (var b = 0; b < length2; b++) {
        //         //if(parentvalues[a]==parentvalues1[b] && parentnames[a] == parentnames1[b])
        //         // if(parentvalues1[b] && parentnames1[b])
        //         // {
        //         var storename = parentnames1[b];
        //         var storedata = parentvalues1[b];
        //         count++;
        //         var myObj = {
        //             "ou":
        //                 { "name": storename, "id": storedata }									//your id variable
        //         };
        //         //favorites.push( myObj );
        //         console.log(myObj);
        //         calcuate(myObj);
        //         //console.log(storedata);
        //         // }

        //     }

        //     // }
        //     function calcuate(myObj) {
        //         var htmlString = '';
        //         $.each(myObj, function (i, ou) {
        //             //if(i=="name"){
        //             //var importID =
        //             htmlString += '<tr> <td>' + myObj.ou.name + '</td> <td align="right"><input class="" style="width:75px;font-size:12px" id="' + myObj.ou.id + '" type="file" accept=".xls,.xlsx"/></td> </tr>';
        //             //}
        //         });
        //         $("#confirmedUploadsContent").append(htmlString);
        //         $("#confirmedUploadsDiv").attr("style", "width:300px;display:inline-block;float:right;max-height:500px;overflow-y:auto;padding:30px 10px 30px 10px");

        //         $.each(myObj, function (i, ou) {
        //             //console.log("doneee");
        //             var elementID = myObj.ou.id;
        //             //console.log("elementID : " + elementID);
        //             var fileID = document.getElementById(elementID);
        //             fileID.addEventListener('change', function (e) {
        //                 handleInputFile(e, ou);
        //             }, false);
        //         });

        //         $("#confirmedUploadsDiv").attr("style", "width:300px;display:inline-block;float:right;height:540px;overflow-y:auto;padding:30px 10px 30px 10px");
        //         $("#confirmedUploadsDiv").removeClass("disabled");
        //         $("#form1").addClass("disabled");
        //         $("#templatesContentDiv").addClass("disabled");
        //         $("#nextBtn").hide();
        //         $("#imb").show();
        //         $("#cancelBtn").removeClass("disabled");
        //         $("#loader").fadeOut();
        //     }
        //     //}
        // };

        //---------------------------------------------------------------------------------------------


		/*
		 $scope.setFacilities = function(){
		 console.log("orgUnitGroup id : " + $("#imOrgUnitGrp").val());
		 if( $("#imOrgUnitGrp").val() != "" ){
		 var url = "../api/organisationUnitGroups/" + $("#imOrgUnitGrp").val() + ".json";
		 console.log("url : " + url);
		 $.get(url, function(oug){
		 var imOrgUnitHTML = "";
		 $.each( oug.organisationUnits , function( i, ou ){
		 imOrgUnitHTML = imOrgUnitHTML + "<option value='"+ ou.id +"' > " + ou.name +" </option>";
		 });
		 $("#imOrgUnit").html("");
		 $("#imOrgUnit").append(imOrgUnitHTML);
		 });
		 }
		 };
		 */

        $scope.filterOrgUnits = function () {
            var orgUnitGroupID = $("#imOrgUnitGrp").val();
            var parentUnitID = $scope.selectedOrgUnit.id;
            var url = "../../../api/organisationUnits.json?paging=false&fields=id,name&filter=parent.id:eq:" + parentUnitID + "&filter=organisationUnitGroups.id:eq:" + orgUnitGroupID + "";
            $.get(url, function (ous) {
                if (ous.organisationUnits.length) {
                    var htmlString = '<tr><td colspan="2" align="center"> Browse Files</td></tr>';
                    $.each(ous.organisationUnits, function (i, ou) {
                        //var importID = "orgUnit-"+i+"-file" ;
                        var importID = ou.id;
                        htmlString += '<tr> <td>' + ou.name + '</td> <td align="right"><input class="" style="width:75px;font-size:12px" id="' + ou.id + '" type="file" accept=".xls,.xlsx"/></td> </tr>';
                    });
                    //						console.log("String : " + htmlString);
                    $("#confirmedUploadsContent").html(htmlString);
                    $("#confirmedUploadsDiv").attr("style", "width:300px;display:inline-block;float:right;max-height:500px;overflow-y:auto;padding:30px 10px 30px 10px");
                    $.each(ous.organisationUnits, function (i, ou) {
                       
                        //console.log("doneee");
                        var elementID = ou.id;
                        //console.log("elementID : " + elementID);
                        var fileID = document.getElementById(elementID);
                        fileID.addEventListener('change', function (e) {
                            handleInputFile(e, ou);
                            $("#loader").fadeOut();
                        }, false);
                    });
                } else {
                    var htmlString = '<tr><td colspan="2" align="center"> No OrgUnits found</td></tr>';
                    $("#confirmedUploadsContent").html(htmlString);
                }
                $("#confirmedUploadsDiv").attr("style", "width:300px;display:inline-block;float:right;height:540px;overflow-y:auto;padding:30px 10px 30px 10px");
                $("#confirmedUploadsDiv").removeClass("disabled");
                $("#form1").addClass("disabled");
                $("#templatesContentDiv").addClass("disabled");
                $("#nextBtn").hide();
                $("#imb").show();
                $("#cancelBtn").removeClass("disabled");
                $("#loader").fadeOut();
            });
        };

        $scope.monthString = function (pst) {
            var month = pst.substring(4, 6);
            var ms = "";

            if (month == "01")
                ms = "Jan";
            else if (month == "02")
                ms = "Feb";
            else if (month == "03")
                ms = "Mar";
            else if (month == "04")
                ms = "Apr";
            else if (month == "05")
                ms = "May";
            else if (month == "06")
                ms = "Jun";
            else if (month == "07")
                ms = "Jul";
            else if (month == "08")
                ms = "Aug";
            else if (month == "09")
                ms = "Sep";
            else if (month == "10")
                ms = "Oct";
            else if (month == "11")
                ms = "Nov";
            else if (month == "12")
                ms = "Dec";

            return ms + " " + pst.substring(0, 4);
        };

        //*****************************************************************************************

        // VALIDATIONS
        $scope.validatedMessage = [];
        $scope.isEverythingOK = true;

        $scope.validateAll = function (orgUnit, index) {
            var numberCells = '';
            var dataCells = [];
            //				$scope.validatedMessage.length = 0;
            //				$("#loader").fadeIn();
            //$("#templateProgress").html("Getting data from data sheet");
            $("#templateProgress").html("Validating sheet : " + orgUnit.name);

            if (orgUnit.result) {
                // extract all cell addresses and it's values
				/* *** */				orgUnit.result.forEach(function (r) {
                    //console.log("r is : " + r);
                    var cell = {};
                    cell.address = r.split("=")[0];

                    if (r.split("=").length > 1)
                        cell.value = r.split("=")[1].slice(1).trim(); //There is an additional char in the value

                    dataCells.push(cell);
                    //confirmedUploads[item].dataCells = dataCells;
                    orgUnit.dataCells = dataCells;
                  
                    $scope.confirmedUploads.orgUnits[index] = orgUnit;
                });
            } else {
                $scope.isEverythingOK = false;
                $scope.validatedMessage.push("Something wrong with " + orgUnit.name + " excel sheet.");
            }

            /* *** */
            var selectedTemp = $scope.getTemplate($scope.confirmedUploads.TempVal);
            //Sheet length validation
            dataCells[dataCells.length-1].address.split("").forEach(val => {               
                if(!isNaN(val)) {
                    numberCells  += val;
                }
            })
            if(numberCells != $scope.dataEndingCell) {
                //alert("This Excel format is  incorrect, Please download the correct format from Excel Import Home Page Link");
                //alert("This Excel format is  incorrect, Please download the correct format from link .." + '<a href="https://nrhm-mis.nic.in/SitePages/HMISFormats.aspx">Code Project</a>' );
                //alert('<a href="https://nrhm-mis.nic.in/SitePages/HMISFormats.aspx">Code Project</a>');

                //For HMIS: https://nrhm-mis.nic.in/SitePages/HMISFormats.aspx
                // For UPHMIS: https://uphmis.in/uphmis/api/documents/MIretHLZPSE/data

                var tempConfirm = confirm('This Excel format is  incorrect, Please download the correct format from Excel Import Home Page Link');
                if ( tempConfirm )
                {
                    //window.location='https://nrhm-mis.nic.in/SitePages/HMISFormats.aspx';
                    //window.location='https://uphmis.in/uphmis/api/documents/MIretHLZPSE/data';
                    //window.open('https://nrhm-mis.nic.in/SitePages/HMISFormats.aspx', '_blank');
                    //window.open('https://uphmis.in/uphmis/api/documents/MIretHLZPSE/data', '_blank');
                    window.history.back();
                }
                else
                {
                    window.history.back();
                }
            }
            if (selectedTemp != "") {

                $.each(selectedTemp.DEMappings, function (i, dem) {

                    $("#templateProgress").html(orgUnit.name + " -> orgValidating data elements mapping - " + (i + 1) + " of " + selectedTemp.DEMappings.length);

                    if (!$scope.isDEAvailable(dem.metadata))
                        $scope.isEverythingOK = false;
                });

				/* orgUnitMapping is not used in new requirement
				 $("#templateProgress").html("Validating organisation unit labels");
				 if( selectedTemp.typeId == 1 ) //MOU - MDE
				 {
				 if( selectedTemp.columnMetaData == "o" )
				 {
				 for( var y = selectedTemp.columnStart.cn; y <= selectedTemp.columnEnd.cn ; y++ )
				 {
				 $scope.isOrgUnitAvailable( $scope.getImportData( selectedTemp.columnStart.rn , y ) );
				 }
				 }
				 else
				 {
				 for( var x = selectedTemp.rowStart.rn; x <= selectedTemp.rowStart.rn ; x++ )
				 {
				 $scope.isOrgUnitAvailable( $scope.getImportData( x , selectedTemp.rowStart.cn ) );
				 }
				 }
				 }
				 else if ( selectedTemp.typeId == 2 ) //SOU - MDE
				 {
				 //if( selectedTemp.columnMetaData == "o" )
				 console.log(selectedTemp.orgUnitCell.rn + " " +  selectedTemp.orgUnitCell.cn );
				 //$scope.isOrgUnitAvailable( $scope.getImportData( selectedTemp.orgUnitCell.rn , selectedTemp.orgUnitCell.cn ) );
				 //else
				 //$scope.isOrgUnitAvailable( $scope.getImportData( selectedTemp.rowStart.rn , selectedTemp.rowStart.cn ) );
				 }
				 */
            }

            //				$("#loader").fadeOut();

        };

        $scope.viewConflicts = function () {
            var htmlString = "";

            htmlString += "<ol>";

            $.each($scope.validatedMessage, function (i, m) {
                htmlString += "<li>" + m + "</li>";
            });

            htmlString += "</ol>";

            $("#confBdy").html(htmlString);
            $("#conflictModal").modal('show');
        };

        // to check if a data element is available while validating
        $scope.isDEAvailable = function (de) {
            var deId = de.split("-")[0];
            var coc = de.split("-").length > 1 ? de.split("-")[1] : "";

            var isDeFound = false;
            var isCocFound = false;

            $.each($scope.dataElements, function (i, d) {
                if (d.id == deId) {
                    isDeFound = true;

                    $.each(d.categoryCombo.categoryOptionCombos, function (i, c) {
                        if (c.id == coc) {
                            isCocFound = true;
                            return false;
                        }
                    });
                    return false;
                }
            });
            console.log(" de : " + isDeFound + " coc : " + isCocFound);

            if (!isDeFound) {
                //$.get("../../../api/dataElements/" + deId + ".json?fields=name", function (elementName) {
                    $scope.validatedMessage.push("Data element: " + dataElementNameMap[deId] +" (" + deId + ") not found");
                //});
                return false;
            } else {
                if (!isCocFound) {
                    var deIdName = "";
                    //$.get("../../../api/dataElements/" + deId + ".json?fields=name", function (elementName) {
                        //deIdName = elementName.name;
                        deIdName = dataElementNameMap[deId];
                    //});
                    $.get("../../../api/categoryCombos/" + deId + ".json?fields=name", function (COCName) {
                        $scope.validatedMessage.push("COC: " + COCName.name + " ( "+ coc + ") of data element: " + deIdName + " (" + deId + ") is not found");
                    });
                    return false;
                } else
                    return true;
            }
        };
        // IMPORT FUNCTION
        //****************************************************************************************************************
        //****************************************************************************************************************

        $scope.h = {};
        $scope.importData = function (orgUnit, index, callbackfunct) {
            $.when(
                $.getJSON("../../../api/organisationUnits/" + orgUnit.id + ".json?fields=comment", {
                    format: "json"
                })
             
            ).always(function (data5) {
                factype = data5.comment;
                factype = factype.substring(factype.indexOf(":") + 1).trim();
                console.log(factype);
            var selectedTemp = $scope.getTemplate($scope.confirmedUploads.TempVal);
            var dataValues = [];
            if (selectedTemp != "") {


                // MOU - MDE
                if (selectedTemp.typeId == 1) {
                    console.log("yes it is mou - mde");
                    if (selectedTemp.columnMetaData == "o") {
                        for (var x = 0; x < selectedTemp.DEMappings.length; x++) {
                            var rowNum = selectedTemp.DEMappings[x].rowNumber;
                            for (var y = selectedTemp.columnStart.cn; y <= selectedTemp.columnEnd.cn; y++) {
                                var dataValue = {};
                                dataValue.period = $("#importPeriod").val();
                                dataValue.dataElement = selectedTemp.DEMappings[x].metadata.split("-")[0];
                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                var ouLabel = $scope.getImportData(selectedTemp.columnStart.rn, y);
                                dataValue.orgUnit = $scope.getOrgUnitByLabel(ouLabel);
                                dataValue.value = $scope.getImportData(rowNum, y);
                                if ($("#importEmpty").val() == 2)
                                    dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                else
                                    dataValue.value = dataValue.value == "" ? 0 : dataValue.value;
                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                            }
                        }
                    }
                    else {
                        for (var x = 0; x < selectedTemp.DEMappings.length; x++) {
                            var colNum = selectedTemp.DEMappings[x].colNumber;
                            for (var y = selectedTemp.rowStart.rn; y <= selectedTemp.rowEnd.rn; y++) {
                                var dataValue = {};
                                dataValue.period = $("#importPeriod").val();
                                dataValue.dataElement = selectedTemp.DEMappings[x].metadata.split("-")[0];
                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                var ouLabel = $scope.getImportData(y, selectedTemp.rowStart.cn);
                                dataValue.orgUnit = $scope.getOrgUnitByLabel(ouLabel);
                                dataValue.value = $scope.getImportData(y, colNum);
                                if ($("#importEmpty").val() == 1)
                                    dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                else
                                    dataValue.value = dataValue.value == "" ? 0 : dataValue.value;
                                if (dataValue.orgUnit != "" && dataValue.value != "omit")
                                    dataValues.push(dataValue);
                            }
                        }
                    }
                }

                // SOU - MDE
                if (selectedTemp.typeId == 2) {
                    $scope.dp = [];
                    for (var x = 0; x < selectedTemp.DEMappings.length; x++) {
                        var cellAddress = selectedTemp.DEMappings[x].cellAddress;

                        var dataValue = {};
                        var data5;
                        var value1;
                        var value2;
                        var value3;
                        var orgName;

                        dataValue.period = $scope.confirmedUploads.periodVal;
                        dataValue.dataElement = selectedTemp.DEMappings[x].metadata.split("-")[0];
                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                        dataValue.orgUnit = orgUnit.id;
                        orgName = orgUnit.name;
                      /*  $.ajax({

                            type: "GET",
                            dataType: "json",
                            contentType: "application/json",
                            url: "../../../api/organisationUnits/" + orgUnit.id + ".json?fields=comment",
                            success: function (data5) {


                                factype = data5.comment;
                                factype = factype.substring(factype.indexOf(":") + 1);
                                console.log(factype);

                            },
                            error: function (response) { }
                        });
                        */

                        //Checking true false and date type
                       //$.get("../../../api/dataElements/" + dataValue.dataElement + ".json?fields=valueType", function (data) {

                        //var deType = data.valueType;
                        var deType = dataElementValueTypeMap[ dataValue.dataElement ];

                        if(deType == "BOOLEAN") {
                            var tempBoolenValue = $scope.getImportDataByAddress(cellAddress, orgUnit);
                            var convertToSmall = ($scope.getImportDataByAddress(cellAddress, orgUnit)).toLowerCase();
                            if( tempBoolenValue === "TRUE" || tempBoolenValue === "YES" || tempBoolenValue === "True" || tempBoolenValue === "Yes" ||
                                convertToSmall == "yes" || convertToSmall == "true" || convertToSmall == "t" || convertToSmall == "y") {

                                dataValue.value = true;
                            }
                            else if( tempBoolenValue === "FALSE" || tempBoolenValue === "NO" || tempBoolenValue === "False" || tempBoolenValue === "No" ||
                                    convertToSmall == "no" || convertToSmall == "false" || convertToSmall == "f" || convertToSmall == "n") {
                                dataValue.value = false;
                            }
                        }

                        else if (deType === "DATE") {
                            var temp = $scope.getImportDataByAddress(cellAddress, orgUnit);
                            
                            var dd = temp.substring(0, 2);
                            var mm = temp.substring(2, 4);
                            var yy = temp.substring(4, 8);

                            var date = yy + "-" + mm + "-" + dd;
                            dataValue.value = date;
                        }
                    //});

                        /************************************* FOR SC ************************************************************/
                        if (factype == "SC") {

                            if (dataValue.dataElement == "FIaGENXR3c5" || dataValue.dataElement == "fqM6fGLUqVD") {

                                dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                dataValue.orgUnit = orgUnit.id;
                                /*
                                dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;

                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                                */
                                if (dataValue.orgUnit != "" && dataValue.value != "") {
                                    dataValues.push(dataValue);
                                }


                                //dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                $scope.dp.push(dataValue.value);

                                for (var i = 0; i < $scope.dp.length; i++) {

                                    value1 = $scope.dp[0];
                                    value2 = $scope.dp[1];

                                }
                                if (value1 == "") {
                                    alert("For " + orgName + " organisation Delivery Point value is empty, Data not imported , please import again.");
                                    window.location.reload();
                                    break;

                                }

                                if (value1 == "true") {
                                    if (value2 == "") {
                                        alert("For " + orgName + " If Delivery point value is true then please select Level of Delivery point and import again and import again");
                                        window.location.reload();
                                        break;
                                    }
                                    else {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                }
                                if (value1 == "false") {
                                    if (value2 == "") {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                    else if (value2 == undefined) {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                    else {
                                        alert("For " + orgName + " If Delivery point value is false then Level of Delivery point should not be selected");
                                        window.location.reload();
                                        break;
                                    }
                                }


                            }

                            else {

                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                dataValue.orgUnit = orgUnit.id;

                                dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                /*
                                dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;

                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                                */

                                if (dataValue.orgUnit != "" && dataValue.value != "") {
                                    dataValues.push(dataValue);
                                }
                            }
                        }

                        /********************************************************** FOR DH **************************************************/
                        else if (factype == "DH" || factype == "DWH" || factype == "OTH" || factype == "DMH" || factype == "DCH"
                            || factype == "MC" || factype == "DH_TB" || factype == "DH_EYE") {

                            if (dataValue.dataElement == "FIaGENXR3c5" || dataValue.dataElement == "fqM6fGLUqVD") {

                                dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                dataValue.orgUnit = orgUnit.id;

                                /*
                                dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                                */

                                if (dataValue.orgUnit != "" && dataValue.value != "") {
                                    dataValues.push(dataValue);
                                }

                                //dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                $scope.dp.push(dataValue.value);

                                for (var i = 0; i < $scope.dp.length; i++) {

                                    value1 = $scope.dp[0];
                                    value2 = $scope.dp[1];
                                }

                                if (value1 == "") {
                                    alert("For " + orgName + " organisation Delivery Point value is empty, Data not imported , please import again.");
                                    window.location.reload();
                                    break;

                                }

                                if (value1 == "true") {
                                    if (value2 == "") {
                                        alert("For " + orgName + " If Delivery point value is true then please select Level of Delivery point and import again");
                                        window.location.reload();
                                        break;
                                    }
                                    else {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                }
                                if (value1 == "false") {
                                    if (value2 == "") {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                    else if (value2 == undefined) {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                    else {
                                        alert("For " + orgName + " If Delivery point value is false then Level of Delivery point should not be selected");
                                        window.location.reload();
                                        break;
                                    }
                                }


                            }

                            else {
                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                dataValue.orgUnit = orgUnit.id;

                                dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                /*
                                dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                                */
                                if (dataValue.orgUnit != "" && dataValue.value != "") {
                                    dataValues.push(dataValue);
                                }
                            }
                        }


                        /********************************************************** FOR CHC **************************************************/
                        else if (factype == "CHC" || factype == "BCHC" || factype == "UCHC") {


                            if (dataValue.dataElement == "FIaGENXR3c5" || dataValue.dataElement == "fqM6fGLUqVD"
                                || dataValue.dataElement == "GpEwBknDwF9") {

                                dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                dataValue.orgUnit = orgUnit.id;
                                /*
                                dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                                */
                                if (dataValue.orgUnit != "" && dataValue.value != "") {
                                    dataValues.push(dataValue);
                                }

                                $scope.dp.push(dataValue.value);

                                for (var i = 0; i < $scope.dp.length; i++) {

                                    value1 = $scope.dp[2];
                                    value2 = $scope.dp[1];
                                    value3 = $scope.dp[0];
                                }
                                if (value3 == "") {
                                    alert("For " + orgName + " organisation FRU value is empty,please fill and import again");
                                    window.location.reload();
                                    break;
                                }
                                if (value1 == "") {
                                    alert("For " + orgName + " organisation Delivery Point value is empty, Data not imported , please import again.");
                                    window.location.reload();
                                    break;

                                }

                                if (value1 == "true") {
                                    if (value2 == "") {
                                        alert("For " + orgName + " If Delivery point value is true then please select Level of Delivery point and import again");
                                        window.location.reload();
                                        break;
                                    }

                                    /*
                                    else {
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                    }
                                    */
                                }
                                if (value1 == "false") {
                                    if (value2 == "") {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                    else if (value2 == undefined) {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                    else {
                                        alert("For " + orgName + " If Delivery point value is false then Level of Delivery point should not be selected");
                                        window.location.reload();
                                        break;
                                    }
                                }
                            }

                            else {

                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                dataValue.orgUnit = orgUnit.id;

                                dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                /*
                                dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                                */

                                if (dataValue.orgUnit != "" && dataValue.value != "") {
                                    dataValues.push(dataValue);
                                }
                            }
                        }
                        /******************************************** FOR PHC ********************************************************/
                        else if (factype == "PHC" || factype == "BPHC" || factype == "UPHC" || factype == "NPHC"
                            || factype == "APHC") {


                            if (dataValue.dataElement == "FIaGENXR3c5" || dataValue.dataElement == "fqM6fGLUqVD") {

                                dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                dataValue.orgUnit = orgUnit.id;

                                /*
                                dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                                */

                                if (dataValue.orgUnit != "" && dataValue.value != "") {
                                    dataValues.push(dataValue);
                                }
                                //dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                $scope.dp.push(dataValue.value);

                                for (var i = 0; i < $scope.dp.length; i++) {

                                    value1 = $scope.dp[0];
                                    value2 = $scope.dp[1];
                                }

                                if (value1 == "") {
                                    alert("For " + orgName + " organisation Delivery Point value is empty, Data not imported , please import again.");
                                    window.location.reload();
                                    break;

                                }

                                if (value1 == "true") {
                                    if (value2 == "") {
                                        alert("For " + orgName + " If Delivery point value is true then please select Level of Delivery point and import again");
                                        window.location.reload();
                                        break;
                                    }
                                    else {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                }
                                if (value1 == "false") {
                                    if (value2 == "") {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                    else if (value2 == undefined) {
                                        /*
                                        dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                        dataValue.orgUnit = orgUnit.id;
                                        dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                        dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                        if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                            dataValues.push(dataValue);
                                        }
                                        */
                                    }
                                    else {
                                        alert("For " + orgName + " If Delivery point value is false then Level of Delivery point should not be selected");
                                        window.location.reload();
                                        break;
                                    }
                                }


                            }

                            else {
                                dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                                dataValue.orgUnit = orgUnit.id;

                                dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                                /*
                                dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                                if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                    dataValues.push(dataValue);
                                }
                                */

                                if (dataValue.orgUnit != "" && dataValue.value != "") {
                                    dataValues.push(dataValue);
                                }
                            }
                        }

                        else {
                            dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
                            dataValue.orgUnit = orgUnit.id;

                            dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                            /*
                            dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
                            if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                                dataValues.push(dataValue);
                            }
                            */

                            if (dataValue.orgUnit != "" && dataValue.value != "") {
                                dataValues.push(dataValue);
                            }
                        }
                    }

                    /*
                    dataValue.value = $scope.getImportDataByAddress(cellAddress, orgUnit);
                    dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;

                    if (dataValue.orgUnit != "" && dataValue.value != "omit") {
                        dataValues.push(dataValue);
                    }
                    */
                }
            }



            ///////////////////////////////////////////////////////////////////////
            console.log("dataValues : " + JSON.stringify(dataValues));
            //				}

			/*	couldn't find any use of this
			 $.each( dataValues , function(i,v){
			 });
			 */

            $("#templateProgress").html(orgUnit.name + " -> Importing data.. Please wait.. This may take several minutes..");

            //console.log( dataValues );
            var dataValueSet = {};
            dataValueSet.dataValues = dataValues;


            //making ready to import data
            $.get("../../../api/system/info", function (data) {
                //adding history
                //					var h = {};

                $scope.h.time = data.serverDate.split("T")[0] + " (" + data.serverDate.split("T")[1].split(".")[0] + ")";
                //					$scope.h.orgUnitGroup = $scope.confirmedUploads.orgUnitGrpName;
                $scope.h.orgUnits[index] = orgUnit.name;
                //					$scope.h.dataSet = $scope.confirmedUploads.dataSetName;
                //					$scope.h.period = $scope.confirmedUploads.periodName;
                //					$scope.h.template = $scope.confirmedUploads.TempName;

                if ($scope.validatedMessage.length == 0 && $scope.isEverythingOK)
                    $scope.validatedMessage.push("Everything was perfect as per validations");

                $scope.h.orgUnits[index] = $scope.validatedMessage;
                //					$scope.h.stats = {};
                //					$scope.h.stats.upc = 0;
                //					$scope.h.stats.imc = 0;
                //					$scope.h.stats.igc = 0;
                $scope.h.orgUnits[index].stats = {};

                //saving data
                ExcelMappingService.importData(dataValueSet).then(function (tem) {
                    //						$("#loader").hide();
                    console.log("index : " + index);
                   
                    console.log("no of orgUnits : " + $scope.confirmedUploads.orgUnits.length);
                    console.log(tem.data.importCount.updated);
                    console.log(tem.data.importCount.imported);
                    console.log(tem.data.importCount.ignored);

                    // complete registration
                    if (tem.data.importCount.updated > 0 || tem.data.importCount.imported > 0) {
                        for (var i = 0; i < $scope.confirmedUploads.orgUnits.length; i++) {

                            cdsr.completeDataSetRegistrations.push({
                                'dataSet': $("#imDataSetId").val(),
                                'period': $("#importPeriod").val(),
                                'organisationUnit': $scope.confirmedUploads.orgUnits[i].id
                                // 'multiOu': false
                            })

                            $.ajax({
                                url: '../../../api/completeDataSetRegistrations',
                                data: JSON.stringify(cdsr),
                                contentType: "application/json; charset=utf-8",
                                dataType: 'json',
                                type: 'post',
                                success: function (data, textStatus, xhr) {
                                    $("#dataSetRegistrationsComplete").html("SUCCESS");
                                    console.log("Registration Complete");
                                },
                                error: function (xhr, textStatus, errorThrown) {
                                    console.log("Error in Registration Complete");
                                    $("#dataSetRegistrationsComplete").html("IGNORED");
                                    if (409 == xhr.status || 500 == xhr.status) // Invalid value or locked
                                    {

                                    }
                                    else // Offline, keep local value
                                    {

                                    }
                                }
                            });

                            console.log(cdsr);

                            console.log($scope.confirmedUploads.orgUnits[i].id + " --" + $("#imDataSetId").val() + "--" + $("#importPeriod").val());
                        }

                    }
                    else {
                        $("#dataSetRegistrationsComplete").html("IGNORED");
                    }

                    $scope.h.stats.upc += tem.data.importCount.updated;
                    $scope.h.orgUnits[index].stats.upc = tem.data.importCount.updated;
                    $scope.h.stats.imc += tem.data.importCount.imported;
                    $scope.h.orgUnits[index].stats.imc = tem.data.importCount.imported;
                    $scope.h.stats.responseDescription = tem.data.description;
                    //$scope.h.stats.igc += tem.data.importCount.ignored;
                    //$scope.h.orgUnits[index].stats.igc = tem.data.importCount.ignored;

                    if( tem.data.conflicts === undefined )
                    {
                        $("#conflictDetails").html("No Conflicts" );
                        $scope.h.stats.igc += 0;
                        $scope.h.orgUnits[index].stats.igc = 0;
                    }
                    else {
                        $("#conflictDetails").html(JSON.stringify(tem.data.conflicts));
                        $scope.h.stats.igc += tem.data.importCount.ignored;
                        $scope.h.orgUnits[index].stats.igc = tem.data.importCount.ignored;
                    }


                    $scope.history.history.push($scope.h);
                    $scope.storeHistory();

                    console.log("org upc : " + $scope.h.orgUnits[index].stats.upc);
                    console.log("org imc : " + $scope.h.orgUnits[index].stats.imc);
                    console.log("org igc : " + $scope.h.orgUnits[index].stats.igc);
                    console.log("upc stat : " + $scope.h.stats.upc);
                    console.log("imc stat : " + $scope.h.stats.imc);
                    console.log("igc stat : " + $scope.h.stats.igc);

                    //						$("#upc").html(tem.data.importCount.updated);
                    //						$("#imct").html(tem.data.importCount.imported);
                    //						$("#igc").html(tem.data.importCount.ignored);
                    //						$("#stModal").modal('show');
                    if ($scope.confirmedUploads.orgUnits.length == (index + 1)) {
                        callbackfunct();
                    }
                });
            });
		})
        };

        //****************************************************************************************************************
        //****************************************************************************************************************
        //****************************************************************************************************************
        //****************************************************************************************************************

        $scope.getTemplate = function (id) {
            var t = "";

            $scope.templates.templates.forEach(function (te) {
                if (te.id == id) {
                    t = te;
                    $scope.dataEndingCell = te.dataEnd.rn;
                }
            });

            return t;
        };

        $scope.getImportData = function (rowNum, colNum) {
            var address = $scope.engAddress[colNum] + "" + rowNum;
            var val = "";

			/* removed this part since it is not used in SOU - MDE in importData()
			 $scope.dataCells.forEach(function(c){
			 if( c.address == address )
			 val = c.value;
			 });
			 */

            return (val);
        };

        $scope.getImportDataByAddress = function (add, orgUnit) {
            var address = add;
            var val = "";

            orgUnit.dataCells.forEach(function (c) {
                if (c.address == address)
                    val = c.value;
            });
            console.log("value : " + val);
            return (val);
        };

        $scope.generateEnglishAddresses = function () {
            //generating more address notations for columns
            for (var x = 1; x < 27; x++) {
                for (var y = 1; y < 27; y++) {
                    $scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y]);
                }
            }

            for (var x = 1; x < 27; x++) {
                for (var y = 1; y < 27; y++) {
                    for (var z = 1; z < 27; z++) {
                        $scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y] + "" + $scope.engAddress[z]);
                    }
                }
            }

            for (var x = 1; x < 27; x++) {
                for (var y = 1; y < 27; y++) {
                    for (var z = 1; z < 27; z++) {
                        for (var u = 1; u < 27; u++) {
                            $scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y] + "" + $scope.engAddress[z] + "" + $scope.engAddress[u]);
                        }
                    }
                }
            }
        };



        $scope.storeHistory = function () {
            ExcelMappingService.save('Excel-import-app-history', $scope.history).then(function (r) {
                //console.log(r);
            });
        };

        $scope.validateUploads = function () {
            $("#loader").fadeIn();
            $scope.validatedMessage.length = 0;
            $scope.isEverythingOK = true;

            $scope.confirmedUploads.orgUnits.forEach(function (orgUnit, index) {
                $scope.validateAll(orgUnit, index);
            });

            if ($scope.isEverythingOK) {
                $("#ime").show();
            } else {
                $("#imd").show();
                $scope.viewConflicts();
            }

            $("#confirmedUploadsDiv").addClass("disabled");
            $("#imb").hide();
            $("#loader").fadeOut();
        };

        $scope.importUploads = function () {
            $("#loader").fadeIn();

            $scope.h.orgUnitGroup = $scope.confirmedUploads.orgUnitGrpName;
            $scope.h.dataSet = $scope.confirmedUploads.dataSetName;
            $scope.h.period = $scope.confirmedUploads.periodName;
            $scope.h.template = $scope.confirmedUploads.TempName;
            $scope.h.orgUnits = [];
            $scope.h.stats = {};
            $scope.h.stats.upc = 0;
            $scope.h.stats.imc = 0;
            $scope.h.stats.responseDescription = "";
            $scope.h.stats.igc = 0;

            var callbackfunct = function () {
                $("#responseDescription").html($scope.h.stats.responseDescription);
                $("#upc").html($scope.h.stats.upc);
                $("#imct").html($scope.h.stats.imc);
                $("#igc").html($scope.h.stats.igc);

                $("#stModal").modal('show');

                $("#loader").fadeOut();

            };

            $scope.confirmedUploads.orgUnits.forEach(function (orgUnit, index) {
                
            $("#loader").fadeIn();
            $("#templateProgress").html(orgUnit.name + " -> preparing data values to import");
            $timeout(()=> {
                $scope.importData(orgUnit, index, callbackfunct);
            },1000)
            });

        };

        function loadDataElements() {
            $.ajax({
                url: "../../../api/dataElements.json?fields=id,name,valueType&paging=false",
                type: "GET",
                dataType: "json",
                contentType: "application/json",
                async: false,
                success: function (dataElementsResponse) {
                    for (var i = 0; i < dataElementsResponse.dataElements.length; i++) {

                        dataElementValueTypeMap[dataElementsResponse.dataElements[i].id] = dataElementsResponse.dataElements[i].valueType;
                        dataElementNameMap[dataElementsResponse.dataElements[i].id] = dataElementsResponse.dataElements[i].name;
                    }
                },
                error: function (err) {
                    console.log("org error" + JSON.stringify(err));
                }
            });
        };
    });