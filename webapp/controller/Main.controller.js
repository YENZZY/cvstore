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
    "sap/m/MessageToast",
    "sap/ui/model/FilterOperator",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/layout/HorizontalLayout",
    "sap/ui/layout/VerticalLayout"
    ],
    function (Controller, JSONModel, MessageBox, Filter, Text, Dialog, DialogType, Input, Button, ButtonType, MessageToast, FilterOperator, SimpleForm, HorizontalLayout, VerticalLayout) {
    "use strict";
    
    return Controller.extend("store.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);
        },
    
        _onRouteMatched: function () {
            this._getData();
        },
    
        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
            var oSmanageModel = this.getOwnerComponent().getModel("smanageData");
    
            this._getODataRead(oMainModel, "/Head").done(
                function (aGetData) {
                    this.setModel(new JSONModel(aGetData), "storeModel");
                }.bind(this)).fail(function () {
                    MessageBox.information("지점 조회를 할 수 없습니다.");
                });
    
            this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                var storecodes = aGetData.filter(function (codedata) {
                    return codedata.StoreStatus === 'Y';
                }).map(function (codedata) {
                    return {
                        StoreCode: codedata.StoreCode,
                        StoreName: codedata.StoreName,
                        Uuid : codedata.Uuid
                    };
                });

                var oCodeModel = new JSONModel({ storecodes: storecodes });
                this.setModel(oCodeModel, "codeModel");
            }.bind(this)).catch(function () {
                MessageBox.error("브랜드명을 불러올 수 없습니다.");
            });
        },
        
        // 폐업 버튼  
        onClosed: function (oEvent) {
            var oMainModel = this.getOwnerComponent().getModel();
            var getData = this.getView().getModel("codeModel").getData();
            var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();
        
            var oRowData = getData.storecodes.find(function (item) {
                return item.StoreCode === selectedStoreCode;
            });
        
            if (oRowData) {
                // /Head 테이블에서 StoreCode가 같은 모든 데이터의 Uuid를 가져오기
                var sFilterPath = "/Head";
                var aFilters = [
                    new Filter("StoreCode", FilterOperator.EQ, oRowData.StoreCode)
                ];
        
                oMainModel.read(sFilterPath, {
                    filters: aFilters,
                    success: function (oData) {
                        if (oData.results.length > 0) {
                            var aHeadDeletePromises = oData.results.map(function (oHead) {
                                var sUuid = oHead.Uuid;
                                var sHeadPath = "/Head(guid'" + sUuid + "')";
        
                                return new Promise(function (resolve, reject) {
                                    // Head 삭제
                                    oMainModel.remove(sHeadPath, {
                                        success: resolve,
                                        error: reject
                                    });
                                });
                            });
        
                            // 모든 Head 삭제 작업이 완료되면 성공 메시지 표시
                            Promise.all(aHeadDeletePromises).then(function () {
                                // 데이터 다시 가져오기
                                this._getData();
                                MessageBox.success("삭제 성공");
                            }.bind(this)).catch(function () {
                                MessageBox.error("삭제 실패");
                            });
                        } else {
                            MessageBox.error("해당 StoreCode에 대한 데이터를 찾을 수 없습니다.");
                        }
                    }.bind(this),
                    error: function () {
                        MessageBox.error("헤드 데이터를 불러올 수 없습니다.");
                    }
                });
            } else {
                MessageBox.error("해당 StoreCode를 찾을 수 없습니다.");
            }
        },

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
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "저장",
                        press: function () {
                            console.log("data", oRowData);
                            this.oConfirmDialog.close();
                    
                            // Page로 이동
                            var oRouter = sap.ui.core.UIComponent.getRouterFor(this.getView());
                            oRouter.navTo("Page", {
                                Uuid: this.Uuid,
                                storeCode: oRowData.StoreCode,
                                storeName: oRowData.StoreName,
                            });
                        }.bind(this)
                    }),                    
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
            var getData = this.getModel("storeModel").getData();
            var index = oEvent.getSource().getParent().getParent().getIndex();
            var oRowData = getData[index];

            this.navTo("Page", { 
                Uuid: oRowData.Uuid,
                storeCode: oRowData.StoreCode,
                storeName: oRowData.StoreName,
            });
        }
    });
});
