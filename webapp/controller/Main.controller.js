sap.ui.define([
    "store/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/m/Text",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/ui/model/FilterOperator",
    "sap/ui/layout/HorizontalLayout",
    "sap/ui/layout/VerticalLayout",
    "sap/ui/core/UIComponent",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/ui/core/library",
    "sap/m/ColumnListItem",
    "sap/m/Label",
    "sap/m/Column",
    "sap/ui/table/Column"
],
    function (Controller, JSONModel, MessageBox, Filter, Text, Dialog, DialogType, Input, Button, ButtonType, FilterOperator, HorizontalLayout, VerticalLayout, UIComponent, ValueHelpDialog, coreLibrary, ColumnListItem, Label, MColumn, UIColumn) {
   
        "use strict";
    
    return Controller.extend("store.controller.Main", {

        onInit: function () {

            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);

            //value help 초기 설정
            var oMultiInput;
			oMultiInput = this.byId("multiInput");
			this._oMultiInput = oMultiInput;
            this._oMultiInput.setTokens([]);
        },
        
        _onRouteMatched: function () {

            this._getData();

        },
    
        _getData: function () {

            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
            var oSmanageModel = this.getOwnerComponent().getModel("smanageData");
            
            this._getODataRead(oMainModel, "/Head").done(

                function (aGetData) {

                   // StoreCode를 기준으로 오름차순 정렬
                    aGetData.sort(function (a, b) {

                        return parseInt(a.ProductCode, 10) - parseInt(b.ProductCode, 10);

                    });

                    this.setModel(new JSONModel(aGetData), "storeModel");

                }.bind(this)).fail(function () {

                    MessageBox.information("지점 조회를 할 수 없습니다.");

                });
            
            // 점포 관리 테이블 데이터에서 사용여부가 Y인 브랜드명만 불러옴
            this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {

                var storecodes = aGetData.filter(function (codedata) {

                    return codedata.StoreStatus === 'Y';

                }).map(function (codedata) {

                    return {
                        StoreCode: codedata.StoreCode,
                        StoreName: codedata.StoreName,
                        Uuid : codedata.Uuid,
                        StoreStatus: codedata.StoreStatus,
                        StoreMaintel: codedata.StoreMaintel,
                        StoreCeo: codedata.StoreCeo,
                        StoreLocation: codedata.StoreLocation
                    };
                });

                var oCodeModel = new JSONModel({ storecodes: storecodes });

                this.setModel(oCodeModel, "codeModel");

            }.bind(this)).catch(function () {

                MessageBox.error("브랜드명을 불러올 수 없습니다.");
            
            });
        },
        
        //폐업 버튼
        onClosed: function () {

            var oMainModel = this.getOwnerComponent().getModel();
            var oSmanageModel = this.getOwnerComponent().getModel("smanageData");
            var getData = this.getView().getModel("codeModel").getData(); //사용여부가 Y인 브랜드에 대한 정보 담겨 있음
            var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();
        
            // 선택한 편의점명에 해당하는 데이터 찾기
            var oRowData = getData.storecodes.find(function (item) {

                return item.StoreCode === selectedStoreCode;
            });
        
            if (oRowData) {
                // codeModel에서 선택한 편의점의 상태를 '사용여부(N)'으로 변경
                oRowData.StoreStatus = 'N';
        
                // smanageData 모델 업데이트
                this._getODataUpdate(oSmanageModel, "/Smanage(guid'" + oRowData.Uuid + "')", oRowData)

                    .then(function () {

                        // 성공 시 데이터 모델 다시 설정
                        this._getODataRead(oSmanageModel, "/Smanage")

                            .then(function (aGetData) {

                                var storecodes = aGetData.filter(function (codedata) {
                                    return codedata.StoreStatus === 'Y';

                                }).map(function (codedata) {

                                    return {
                                        StoreCode: codedata.StoreCode,
                                        StoreName: codedata.StoreName,
                                        Uuid: codedata.Uuid,
                                        StoreStatus: codedata.StoreStatus,
                                        StoreMaintel: codedata.StoreMaintel,
                                        StoreCeo: codedata.StoreCeo,
                                        StoreLocation: codedata.StoreLocation
                                    };
                                });
        
                                var oCodeModel = new JSONModel({ storecodes: storecodes });
                                
                                this.setModel(oCodeModel, "codeModel");

                            }.bind(this))
                            .fail(function (error) {
                                MessageBox.error("편의점 데이터를 불러올 수 없습니다.");
                            });
        
                        // 헤드 데이터 삭제 작업 진행 (선택한 편의점브랜드명과 같은 브랜드의 지점 전체 삭제)
                        var aFilters = [
                        
                            new Filter("StoreCode", FilterOperator.EQ, oRowData.StoreCode)
                        
                        ];
        
                        oMainModel.read("/Head", {

                            filters: aFilters,

                            success: function (oData) {

                                if (oData.results.length > 0) {

                                    var aHeadDeletePromises = oData.results.map(function (oHead) {

                                        var sUuid = oHead.Uuid;
                                        var sHeadPath = "/Head(guid'" + sUuid + "')";
        
                                        return new Promise(function (resolve, reject) {
                                            
                                            // Head 항목 삭제
                                            oMainModel.remove(sHeadPath, {
                                                success: resolve,
                                                error: reject
                                            });
                                        });
                                    });
        
                                    // 모든 Head 삭제 작업 완료 후 성공 메시지 표시 및 데이터 갱신
                                    Promise.all(aHeadDeletePromises).then(function () {

                                        this._getData(); // 데이터 갱신

                                        MessageBox.success("폐업 처리 되었습니다.");
                                    
                                    }.bind(this)).catch(function () {
                                    
                                        MessageBox.error("헤드 삭제 중 오류가 발생했습니다.");
                                    
                                    });
                                } else {
                                  
                                    MessageBox.error("해당 StoreCode에 대한 데이터를 찾을 수 없습니다.");
                               
                                }
                            }.bind(this),
                            error: function () {
                               
                                MessageBox.error("헤드 데이터를 불러올 수 없습니다.");
                            
                            }
                        });
                    }.bind(this))
                    .fail(function (error) {
                        MessageBox.error("사용여부가 업데이트 되지 않았습니다.");
                    });
            } else {
                MessageBox.error("해당 StoreCode를 찾을 수 없습니다.");
            }
        },                   

        //생성 버튼(storecode, storename 데이터 전달)
        onCreate: function () {

            var getData = this.getModel("codeModel").getData();
            var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();
        
            // storecodes 배열에서 StoreCode가 일치하는 데이터를 찾습니다.
            var oRowData = getData.storecodes.find(function (item) {
                return item.StoreCode === selectedStoreCode;
            });

            if (oRowData) {

                // 기존 다이얼로그 객체가 존재하면 닫고 삭제
                if (this.oConfirmDialog) {

                    this.oConfirmDialog.close();
                    this.oConfirmDialog.destroy(); // 다이얼로그 객체 삭제
                    this.oConfirmDialog = null; // 변수 초기화
                
                }
        
                // 새로운 다이얼로그 객체 생성
                this.oConfirmDialog = new Dialog({
                    type: DialogType.Message,
                    title: "지점 등록",
                    content: new VerticalLayout({
                        width: "100%",
                        content: [
                            new HorizontalLayout({
                                content: [
                                    new Text({  
                                        width: "90px",
                                        text: "편의점코드 : "
                                    }),
                                    new Input({ value: oRowData.StoreCode, editable: false })
                                ]
                            }),
                            new HorizontalLayout({
                                content: [
                                    new Text({ 
                                        width: "90px",
                                        text: "편의점명 : " 
                                    }),
                                    new Input({ value: oRowData.StoreName, editable: false })
                                ]
                            }),
                        ]
                    }),

                    //저장
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "저장",
                        press: function () {
                            this.oConfirmDialog.close();
                    
                            // Page로 이동
                            var oRouter = UIComponent.getRouterFor(this.getView());
                            oRouter.navTo("Page", {
                                Uuid: this.Uuid,
                                storeCode: oRowData.StoreCode,
                                storeName: oRowData.StoreName,
                            });
                        }.bind(this)
                    }),     

                    //취소
                    endButton: new Button({
                        text: "취소",
                        press: function () {
                            this.oConfirmDialog.close();
                        }.bind(this)
                    })
                });
        
                // 다이얼로그 열기
                this.oConfirmDialog.open();

            } else {
                console.error("해당 StoreCode를 찾을 수 없습니다.");
            }
        },        
        
        //상세페이지 이동
        onMove: function (oEvent) {
            var oRowData = oEvent.getSource().getParent().getBindingContext("storeModel").getObject().Uuid
            this.navTo("Page", { 
                Uuid: oRowData
            });
        },

        // 지점 리스트 조회 (ValueHelpDialog)
        onValueHelp: function () {
            var oDialog = new ValueHelpDialog({
                title: "편의점 조회",
                supportMultiselect: true,
                key: "StoreCode",
                descriptionKey: "StoreName",
                ok: function (oEvent) {
                    this.onValueHelpOkPress(oEvent);
                }.bind(this),
                cancel: function () {
                    this.onValueHelpCancelPress();
                }.bind(this)
            });
        
            this._oVHD = oDialog;
            this.getView().addDependent(oDialog);
        
            oDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(this.valueModel);
        
                if (oTable.bindRows) {
                    oTable.bindAggregation("rows", {
                        path: "/",
                        events: {
                            dataReceived: function () {
                                oDialog.update();
                            }
                        }
                    });
        
                    var oColumnStoreCode = new UIColumn({
                        label: new Label({ text: "편의점 코드" }),
                        template: new Text({ text: "{StoreCode}" })
                    });
                    oColumnStoreCode.data("fieldName", "StoreCode");
        
                    var oColumnStoreName = new UIColumn({
                        label: new Label({ text: "편의점명" }),
                        template: new Text({ text: "{StoreName}" })
                    });
                    oColumnStoreName.data("fieldName", "StoreName");
        
                    oTable.addColumn(oColumnStoreCode);
                    oTable.addColumn(oColumnStoreName);
                }
        
                if (oTable.bindItems) {
                    oTable.bindAggregation("items", {
                        path: "/",
                        template: new ColumnListItem({
                            cells: [
                                new Label({ text: "{StoreCode}" }),
                                new Label({ text: "{StoreName}" })
                            ]
                        }),
                        events: {
                            dataReceived: function () {
                                oDialog.update();
                            }
                        }
                    });
        
                    oTable.addColumn(new MColumn({ header: new Label({ text: "편의점 코드" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "편의점명" }) }));
                }
        
                oDialog.update();
            }.bind(this));
        
            oDialog.setTokens(this._oMultiInput.getTokens());
            this._getStoreData();
            oDialog.open();
        },

        //select 버튼
        onValueHelpOkPress: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            this._oMultiInput.setTokens(aTokens);
            this._oVHD.close();
        },
        //cancel 버튼
        onValueHelpCancelPress: function () {
            this._oVHD.close();
        },
        
        onValueHelpAfterClose: function () {
            this._oVHD.destroy();
        },
        
        _getStoreData: function () {
            var oStoreModel = this.getOwnerComponent().getModel("smanageData");
        
            oStoreModel.read("/Smanage", {
                success: function (oData) {
                    var aStoreData = oData.results.filter(function (storeData) {
                        return storeData.StoreStatus === 'Y';
                    });
        
                    var oTable = this._oVHD.getTable();
                    oTable.setModel(new JSONModel(aStoreData));
                    oTable.bindRows("/");
                    this._oVHD.update();
                }.bind(this),
                error: function () {
                    sap.m.MessageBox.error("편의점 데이터를 가져오는 데 실패했습니다.");
                }
            });
        },        

        // onValueHelpOkPress: function (oEvent) {
        //     var aTokens = oEvent.getParameter("tokens");
        //     this._oMultiInput.setTokens(aTokens);
        //     this._oVHD.close();
        // },
        
        // onValueHelpCancelPress: function () {
        //     this._oVHD.close();
        // },
        
        // onValueHelpAfterClose: function () {
        //     this._oVHD.destroy();
        // },
        
        // _getStoreData: function () {
        //     var oStoreModel = this.getOwnerComponent().getModel("smanageData");
        
        //     oStoreModel.read("/Smanage", {
        //         success: function (oData) {
        //             var aStoreData = oData.results.filter(function (storeData) {
        //                 return storeData.StoreStatus === 'Y';
        //             });
        
        //             var oTable = this._oVHD.getTable();
        //             oTable.setModel(new JSONModel(aStoreData));
        //             oTable.bindRows("/");
        //             this._oVHD.update();
        //         }.bind(this),
        //         error: function () {
        //             sap.m.MessageBox.error("편의점 데이터를 가져오는 데 실패했습니다.");
        //         }
        //     });
        // },        

         // 조회 버튼을 눌렀을 때 호출되는 함수
         onFind: function () {
            //valuehelp에서 선택된 브랜드명이 들어있는 토큰
            var aStoreNames = this._oMultiInput.getTokens().map(function (token) {
                var storeName = token.getText(); // CU편의점(1)
                var mainStoreName = storeName.replace(/\s*\(\d+\)$/, ''); // (1) 제거
                return mainStoreName.trim(); 
            });

            var aFilters = [];
        
            aStoreNames.forEach(function (sStoreName) {
                aFilters.push(new Filter("StoreName", FilterOperator.EQ, sStoreName));
            });
        
            var oFilter = new Filter({
                filters: aFilters
            });
        
            var oTable = this.getView().byId("storeTable");
            var oBinding = oTable.getBinding("rows");
            oBinding.filter(oFilter);

            if (!aStoreNames || aStoreNames.length === 0) {

                oBinding.filter([]); // 필터 제거
                
                sap.m.MessageBox.information("선택한 편의점명이 없습니다. 전체 지점 리스트를 표시합니다.");
                
                return;
            }
        }
    });
});
