sap.ui.define([
    "store/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/m/Text",
    "sap/m/Dialog",
    "sap/m/DialogType",
    "sap/ui/layout/HorizontalLayout",
    "sap/ui/layout/VerticalLayout",
    "sap/m/TextArea",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/MessageToast",
    ],
    function (Controller, JSONModel, MessageBox, Filter, Text, Dialog, DialogType, HorizontalLayout, VerticalLayout, TextArea, Button, ButtonType, MessageToast) {
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
                        StoreName: codedata.StoreName
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
            var getData = this.getView().getModel("codeModel").getData();
            var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();
        
            var oRowData = getData.storecodes.find(function (item) {
                return item.StoreCode === selectedStoreCode;
            });
        
            if (oRowData) {
                // /Head 테이블에서 StoreCode가 같은 데이터의 Uuid를 가져오기
                var sFilterPath = "/Head";
                var aFilters = [
                    new Filter("StoreCode", FilterOperator.EQ, oRowData.StoreCode)
                ];
        
                oMainModel.read(sFilterPath, {
                    filters: aFilters,
                    success: function (oData) {
                        if (oData.results.length > 0) {
                            var sUuid = oData.results[0].Uuid;
                            var sPath = "/Head(guid'" + sUuid + "')";
        
                            // 관련된 Items를 먼저 삭제
                            oMainModel.read(sPath, {
                                urlParameters: {
                                    "$expand": "Items" 
                                },
                                success: function (oHeadData) {
                                    var aDeletePromises = oHeadData.Items.map(function (oItem) {
                                        return new Promise(function (resolve, reject) {
                                            oMainModel.remove("/Item(" + oItem.Parentsuuid + ")", {
                                                success: resolve,
                                                error: reject
                                            });
                                        });
                                    });
        
                                    Promise.all(aDeletePromises).then(function () {
                                        oMainModel.remove(sPath, {
                                            success: function () {
                                                MessageBox.success("데이터가 삭제되었습니다.");
                                            },
                                            error: function (oError) {
                                                MessageBox.error("데이터를 삭제할 수 없습니다.");
                                            }
                                        });
                                    }).catch(function () {
                                        MessageBox.error("아이템 데이터를 삭제할 수 없습니다.");
                                    });
                                },
                                error: function (oError) {
                                    MessageBox.error("헤드 데이터를 불러올 수 없습니다.");
                                }
                            });
                        } else {
                            MessageBox.error("해당 StoreCode에 대한 데이터를 찾을 수 없습니다.");
                        }
                    },
                    error: function (oError) {
                        MessageBox.error("헤드 데이터를 불러올 수 없습니다.");
                    }
                });
            } else {
                MessageBox.error("해당 StoreCode를 찾을 수 없습니다.");
            }
        },        
        onCreate: function () {
            // var getData = this.getModel("codeModel").getData();
            // var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();
        
            // // storecodes 배열에서 StoreCode가 일치하는 데이터를 찾습니다.
            // var oRowData = getData.storecodes.find(function (item) {
            //     return item.StoreCode === selectedStoreCode;
            // });
            // console.log("o",oRowData);
            // if (oRowData) {
            //     this.navTo("Page", { StoreCode: oRowData.StoreCode, StoreName: oRowData.StoreName });
            // } else {
            //     console.error("해당 StoreCode를 찾을 수 없습니다.");
            // }
                var getData = this.getModel("codeModel").getData();
                var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();
            
                // storecodes 배열에서 StoreCode가 일치하는 데이터를 찾습니다.
                var oRowData = getData.storecodes.find(function (item) {
                    return item.StoreCode === selectedStoreCode;
                });
            
                if (oRowData) {
                    if (!this.oConfirmDialog) {
                        this.oConfirmDialog = new Dialog({
                            type: DialogType.Message,
                            title: "지점 등록",
                            content: [
                                new HorizontalLayout({
                                    content: [
                                        new VerticalLayout({
                                            width: "120px",
                                            content: [
                                                new Text({ text: "편의점코드 : " }),
                                                new Text({ text: "편의점명 : " }),
                                                new Text({ text: "지점명 : " })
                                            ]
                                        }),
                                        new VerticalLayout({
                                            content: [
                                                new Text({ text: oRowData.StoreCode }),
                                                new Text({ text: oRowData.StoreName }),
                                                new TextArea("confirmationNote", {
                                                    width: "auto",
                                                    placeholder: "지점명을 작성해주세요."
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ],
                            beginButton: new Button({
                                type: ButtonType.Emphasized,
                                text: "저장",
                                press: function () {
                                    var sText = sap.ui.getCore().byId("confirmationNote").getValue();
                                    MessageToast.show("Note is: " + sText);
                                    this.oConfirmDialog.close();
            
                                    // Page로 이동
                                    this.navTo("Page", {
                                        StoreCode: oRowData.StoreCode,
                                        StoreName: oRowData.StoreName
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
                    } else {
                        // 기존 Dialog의 내용을 업데이트
                        var aContent = this.oConfirmDialog.getContent()[0].getContent();
                        aContent[1].getContent()[0].setText(oRowData.StoreCode);
                        aContent[1].getContent()[1].setText(oRowData.StoreName);
                    }
            
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

            this.navTo("Page", { Uuid: oRowData.Uuid });
        }
    });
});
